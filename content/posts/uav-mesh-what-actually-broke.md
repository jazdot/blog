---
title: "I Networked a Swarm of UAVs. Here's What Actually Broke."
date: "2026-07-23"
excerpt: "Building an ad-hoc mesh network for 10 autonomous UAVs taught me more about network design than any textbook. Here's the honest breakdown."
tags: ["UAV", "Mesh Networking", "OLSR", "Research"]
readTime: "8 min read"
slug: "uav-mesh-what-actually-broke"
---

Every networking textbook assumes something that most real environments take for granted: *the infrastructure already exists.* There's a base station. A router. Some fixed topology you can reason about.

My MTech thesis at CET Trivandrum was about what happens when none of that exists — when every node is moving, every link is temporary, and the "network" has to build and rebuild itself constantly, mid-flight, while simultaneously carrying the data that keeps the drones flying safely.

This is the honest version of how that went.

## The setup

The scenario was a swarm of 10 UAVs — quadrotors — operating in a dispersed area with no ground control station in the loop for coordination. Each drone needed to share its position, velocity, and mission state with every other drone in near real-time. Think of it like a moving LAN where the computers are also trying not to crash into each other.

<div class="stat-row">
  <div class="stat-box">
    <div class="val">10</div>
    <div class="lbl">UAV nodes</div>
  </div>
  <div class="stat-box">
    <div class="val">OLSR</div>
    <div class="lbl">Routing protocol</div>
  </div>
  <div class="stat-box">
    <div class="val">2 Hz</div>
    <div class="lbl">Telemetry rate</div>
  </div>
  <div class="stat-box">
    <div class="val">802.11s</div>
    <div class="lbl">Radio layer</div>
  </div>
</div>

The routing choice was OLSR — Optimized Link State Routing. It's a proactive protocol, meaning every node maintains a complete map of the network at all times. No on-demand route discovery delays. The moment a packet needs to go somewhere, you already know the path. For real-time telemetry, that sounded perfect.

Spoiler: it was not perfect.

## What we expected

The theory was clean. OLSR uses **Multipoint Relays (MPRs)** to reduce flooding — instead of every node broadcasting topology updates to every other node, each node selects a small subset of neighbors to forward for it. Fewer transmissions, same coverage. In a static network, this is elegant.

<div class="ascii">
  UAV-1 ──── UAV-3 ──────── UAV-6
    │           │  \            │
  UAV-2       UAV-4  UAV-5   UAV-7
                              /  \
                          UAV-8  UAV-9
                            │
                          UAV-10

  MPR of UAV-1: {UAV-3}   (covers UAV-2 via UAV-1 directly)
  MPR of UAV-3: {UAV-6, UAV-5}
  — less flooding, same topology awareness
</div>

In simulation, convergence was fast, packet loss was low, everything looked great. We had confidence going into the hardware tests.

## What actually broke

### 1. The hello interval was lying to us

OLSR discovers neighbors by broadcasting "hello" messages. The default interval: **2 seconds.** A UAV moving at 10 m/s covers 20 meters between hello messages. In an outdoor environment with real radio propagation, that's often the difference between "good link" and "link doesn't exist."

By the time OLSR registered that UAV-5 could no longer reach UAV-3, both drones had moved another 40 meters. Packets were still being sent on a path that had been dead for four seconds. Four seconds at 2 Hz telemetry is 8 missed position updates per link. In a collision-avoidance scenario, that's the entire budget for reaction time — gone.

> **Key failure:** Protocol convergence time was designed around human-scale infrastructure. Drones move at drone-scale. The mismatch isn't subtle — it's an order of magnitude.

### 2. MPR selection became a thrashing storm

Because nodes were moving, the MPR set for any given node kept changing. And every MPR change triggers a Topology Control (TC) message flood through the entire network. In a static network, TC messages are rare. In our swarm, they were nearly continuous.

We were spending more bandwidth on *maintaining awareness of the network* than on the actual telemetry the network existed to carry. The overhead was eating the channel.

```
# Observed TC message rate (per node, per second) at different speeds
Speed 2 m/s:   ~0.5 TC/s    ← manageable
Speed 5 m/s:   ~2.1 TC/s    ← starts hurting
Speed 10 m/s:  ~6.8 TC/s    ← channel saturation at 10 nodes
Speed 15 m/s:  link breaks faster than TC can propagate
```

### 3. ROS gave us false confidence in simulation

Telemetry was running over ROS (Robot Operating System) pub/sub. In simulation, the "network" was a perfect shared memory bus — no latency, no packet loss, no radio physics. Real 802.11s in an outdoor environment with multipath, interference, and moving nodes is nothing like that.

The first time we ran the full stack on hardware and watched the position estimates diverge by 3 meters between drones that were 5 meters apart, we understood the problem. The network was delivering data, but not *fresh* data. Stale state is sometimes worse than no state — a drone acting on position data that's 4 seconds old in a 10 m/s swarm might as well be flying blind.

## The fixes that actually worked

### Aggressive hello tuning

Dropping the hello interval from 2s to 200ms gave OLSR topology updates that were actually useful for fast-moving nodes. The cost was bandwidth — about 6x more hello traffic. Worth it, because the alternative was routing on phantom links.

The TC interval stayed at 1s rather than scaling proportionally, because TC floods are expensive and 1s was still fast enough relative to link lifetime at our target speeds.

### Designing for disconnection, not against it

The biggest mindset shift: stop treating link loss as a failure to recover from, and start treating it as a normal operating condition to plan around.

We added a local state buffer on each drone — the last known position/velocity of each neighbor, with a timestamp and a *confidence decay*. If a drone hadn't heard from UAV-5 in 800ms, it would extrapolate UAV-5's likely position based on last known velocity, flagging the estimate as "predicted" rather than "confirmed." The collision avoidance system treated predicted positions with larger safety margins.

> **The real lesson:** A good distributed system doesn't fight the network's unreliability — it builds unreliability into its data model from the start. Timestamps and confidence scores are not nice-to-haves. They're the only honest way to represent what you actually know.

### GPS-aware neighbor selection

The final improvement was feeding GPS positions into the MPR selection heuristic. Standard OLSR picks MPRs based on link quality (ETX). We modified it to also prefer MPRs whose trajectory was stable relative to the selecting node — i.e., nodes that were moving *with* you, not across you.

A drone 80 meters away moving in the same direction at the same speed is a better MPR candidate than a drone 40 meters away crossing your path. The second link will be dead in 10 seconds. The first might last the entire mission.

## What I'd do differently

If I were starting this from scratch, I'd skip OLSR entirely for high-mobility scenarios and look at **GPSR (Greedy Perimeter Stateless Routing)** or **FANET-specific protocols** that treat mobility as a first-class input rather than a parameter to tune around.

I'd also separate the telemetry plane from the routing plane earlier. Mixing "keeping the network alive" traffic with "doing the mission" traffic on the same channel in a resource-constrained RF environment is asking for trouble. A dedicated heartbeat channel (even a narrowband one) for topology maintenance frees the data channel for actual payload.

And I'd distrust simulation more aggressively. RF physics is not a memcpy.

---

The research was published at **ETET 2025** as a UAV Swarm Mesh Communication Framework — the formal write-up has the full protocol analysis, simulation results, and hardware test data. This post is the version without the LaTeX.

— Riswan · Bengaluru, July 2026
