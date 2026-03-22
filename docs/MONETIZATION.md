# DoneWell Audio — Monetization Strategy & Business Plan

> **Version:** 1.0 | **Date:** 2026-03-14 | **App Version:** 0.95.0

---

## Table of Contents

1. [Market Opportunity](#1-market-opportunity)
2. [Competitive Pricing Analysis](#2-competitive-pricing-analysis)
3. [Pricing Model](#3-pricing-model)
4. [Feature Gating Strategy](#4-feature-gating-strategy)
5. [Revenue Streams](#5-revenue-streams)
6. [Go-To-Market Strategy](#6-go-to-market-strategy)
7. [Financial Projections](#7-financial-projections)
8. [Implementation Plan](#8-implementation-plan)

---

## 1. Market Opportunity

### 1.1 The Problem

Every live sound engineer faces acoustic feedback. It's the single most common problem in live audio — from church worship teams running a handful of open mics to touring engineers managing 40+ channels at festivals. The current solutions fall into two camps:

1. **Hardware boxes** (dbx AFS2, Sabine FBX, Klark Teknik DF1000) — $200-600, dedicated hardware, no analysis or education, must be carried/installed
2. **DAW plugins** (Waves Feedback Hunter, X-FDBK, AlphaLabs De-Feedback) — $80-150, require a plugin host (laptop + audio interface + DAW), not mobile

**Neither camp offers:** a zero-install, mobile-ready, educational, analysis-focused tool that works on any device with a browser.

### 1.2 Total Addressable Market (TAM)

| Segment | Estimated Size (Global) | Annual Spend on Audio Tools | DWA Potential |
|---------|------------------------|----------------------------|---------------|
| Churches/worship | ~400,000 with sound systems | $500-5,000/year on tech | Very High |
| Freelance live sound | ~200,000 active | $1,000-10,000/year on tools | High |
| Small-medium venues | ~300,000 globally | $2,000-20,000/year on tech | High |
| Corporate AV teams | ~100,000 teams | $5,000-50,000/year | Medium |
| Touring professionals | ~50,000 globally | $5,000-20,000/year | Medium |
| System integrators | ~20,000 companies | $10,000-100,000/year | Medium |
| Audio education | ~5,000 institutions | $1,000-10,000/year | Low-Medium |

**Conservative serviceable addressable market (SAM):** 200,000+ potential users in the first 3 years

### 1.3 Why Now

1. **PWAs are mature** — installable, offline-capable, indistinguishable from native apps
2. **Web Audio API is stable** — reliable audio processing in the browser
3. **Mobile devices are powerful enough** — modern phones handle real-time FFT at 25fps
4. **No SaaS player exists** in this niche — all competitors are one-time-purchase plugins or hardware
5. **Church tech is modernizing** — volunteer-driven teams actively adopting digital tools
6. **AI-enhanced analysis** — impossible 5 years ago, now runs in a Web Worker

---

## 2. Competitive Pricing Analysis

### 2.1 Current Market Pricing

| Product | Type | Price | Model | Target |
|---------|------|-------|-------|--------|
| **Waves Feedback Hunter** | VST plugin | $99-149 | One-time (or included in $199/yr Ultimate sub) | Live sound engineers |
| **Waves X-FDBK** | VST plugin | $79-149 | One-time (or included in Ultimate sub) | Live engineers with DAW |
| **AlphaLabs De-Feedback** | VST plugin | ~$99 | One-time | Engineers with NUC hardware |
| **dbx AFS2** | Hardware | $300-400 | One-time (hardware) | Installed systems |
| **Sabine FBX series** | Hardware | $200-400 | One-time (hardware) | Installed systems |
| **Klark Teknik DF1000** | Hardware | $200-300 | One-time (hardware) | Budget installations |
| **Smaart (Rational Acoustics)** | Analysis software | $800-1,200 | One-time + $295/yr updates | System engineers |
| **REW (Room EQ Wizard)** | Analysis software | Free | Open source | Hobbyists/education |

### 2.2 Key Pricing Insights

1. **One-time purchase dominates** — the pro audio market is accustomed to one-time purchases (plugins, hardware). SaaS subscriptions are newer and less accepted.
2. **Waves Ultimate subscription** ($199/year for 230+ plugins) has normalized subscriptions for the Waves ecosystem.
3. **Smaart** at $800-1,200 shows that professionals will pay premium for quality analysis software.
4. **REW being free** shows that a powerful free tier can build massive community adoption.
5. **Churches are budget-conscious** but increasingly adopt subscription tools (Planning Center, ProPresenter licenses).

### 2.3 Pricing Strategy Rationale

DoneWell Audio should use a **freemium model with optional subscriptions** rather than one-time purchase because:

1. **Zero friction for adoption** — free tier removes all barriers
2. **Recurring revenue** — more valuable than one-time sales for sustainability
3. **Feature expansion justifies ongoing cost** — unlike a static plugin, DWA continuously improves
4. **Church/education markets** prefer predictable monthly costs over large upfront purchases
5. **Data flywheel** — more users = more spectral data = better algorithms = more value

---

## 3. Pricing Model

### 3.1 Tier Structure

#### Free Tier — "House" (Zero Cost Forever)

Named after the "house engineer" — the local sound person who handles whatever comes through.

**Included:**
- Single microphone input analysis
- Real-time feedback detection (all 7 algorithms active)
- Basic advisory display (frequency, severity, note name)
- Up to 5 simultaneous active advisories
- Basic GEQ band recommendation (frequency only, no gain/Q details)
- Spectrum analyzer visualization
- GEQ bar overlay
- Input level metering with auto-gain
- Operation mode selection (Rehearsal/Live/Install)
- Offline PWA functionality
- Dark/light theme
- Community support (GitHub Discussions)

**Limited:**
- No session recording/playback
- No detailed PEQ/shelf recommendations
- No export (PDF, CSV, JSON, TXT)
- No room profile saving
- No calibration data export
- No historical analytics
- No multi-channel support
- Watermarked PDF if export ever attempted (shows "Upgrade to Pro")
- Basic onboarding only

**Purpose:** Build user base, demonstrate value, create word-of-mouth in the pro audio community.

---

#### Pro Tier — "FOH" ($9.99/month or $89/year, ~25% annual discount)

Named after "Front of House" — the primary mix position for live sound.

**Everything in Free, plus:**
- **Unlimited active advisories** (no cap)
- **Full EQ recommendations** — GEQ band + PEQ frequency/gain/Q + shelf suggestions
- **MINDS adaptive notch depth** — DAFx-16 paper-based cut depth recommendations
- **Session recording & playback** — save entire analysis sessions, replay with timeline scrubbing
- **Multi-format export** — PDF reports, CSV data, JSON raw data, TXT summary
- **Room profile management** — save up to 20 room profiles with calibration data
- **Calibration export** — full JSON v1.1 calibration data with mic correction curves
- **Spectral waterfall display** — time×frequency×amplitude visualization
- **Early warning system** — pre-feedback alerts with trend analysis
- **Feedback history panel** — session-long history with repeat offender tracking
- **Algorithm status bar** — real-time view of which algorithms are contributing
- **Advanced settings access** — full detection tuning, algorithm weights, threshold adjustment
- **Multi-language UI** — Spanish, Portuguese, Japanese, Korean, German, French
- **Priority email support** — 24-hour response guarantee

**Target users:** Freelance engineers, church tech leads, small venue operators, audio students

---

#### Enterprise Tier — "System Tech" ($29.99/month or $249/year, ~30% annual discount)

Named after "System Technician" — the engineer responsible for the entire PA system.

**Everything in Pro, plus:**
- **Multi-channel analysis** — up to 16 simultaneous microphone inputs
- **Cross-channel correlation** — detect feedback that appears across multiple channels
- **Digital mixer integration** — connect to Behringer X32/X-Air, Yamaha DM/CL, Allen & Heath (via bridge)
- **Auto-EQ application** — send notch filter commands directly to connected mixer
- **Bitfocus Companion module** — Stream Deck integration with live feedback buttons
- **Dante Via setup guide** — step-by-step integration with Dante audio networks
- **Historical analytics dashboard** — cross-session frequency analysis, venue heatmaps
- **Team collaboration** — share sessions with team members in real-time
- **API access** — REST/WebSocket API for custom integrations
- **Custom branding** — white-label option for integrators
- **Priority support** — 4-hour response, onboarding call included
- **Unlimited room profiles**

**Target users:** Touring engineers, system integrators, large churches, corporate AV teams

---

### 3.2 One-Time Add-Ons

| Add-On | Price | Description | Tier Requirement |
|--------|-------|-------------|-----------------|
| **Desktop App** (Tauri) | $49.99 | Native desktop app with direct mixer UDP/TCP access | Pro or Enterprise |
| **Training Mode** | $19.99 | Simulated feedback scenarios for practice/education | Pro or Enterprise |
| **Venue Analysis Report** | $14.99/report | AI-generated detailed venue acoustic analysis from session data | Pro or Enterprise |
| **Lifetime Pro Upgrade** | $299 | One-time payment for permanent Pro access | Free |

### 3.3 Special Pricing

| Program | Discount | Verification | Notes |
|---------|----------|-------------|-------|
| **Church/nonprofit** | 40% off all tiers | Self-declared + domain verification | $5.99/mo Pro, $17.99/mo Enterprise |
| **Education** | 50% off all tiers | .edu email or institution verification | $4.99/mo Pro, $14.99/mo Enterprise |
| **Student** | Free Pro for 1 year | .edu email, renewed annually | Builds loyalty for post-graduation conversion |
| **Early adopter** | 30% off first year | Signup before v1.0 launch | Rewards early community |
| **Annual prepay** | 25-30% off | Automatic | Standard annual discount |

---

## 4. Feature Gating Strategy

### 4.1 Gating Principles

1. **Detection quality is never gated** — all 7 algorithms run at full quality on all tiers. This is the ethical and smart choice. Degrading detection quality for free users creates safety concerns (missed feedback can damage speakers/hearing) and breeds resentment.

2. **Analysis depth is gated** — free users see "what" (frequency + severity), Pro users see "why and how" (EQ recommendations, algorithm breakdown, trends), Enterprise users see "across the system" (multi-channel, mixer integration).

3. **Persistence is gated** — free users get ephemeral analysis (current session only), Pro users get session recording and room profiles, Enterprise users get historical analytics.

4. **Integration is gated** — mixer control, Companion, API access are Enterprise-only. These have real infrastructure costs and target high-value users.

### 4.2 Gate Implementation

```
Feature                        Free    Pro     Enterprise
─────────────────────────────────────────────────────────
Detection algorithms (all 7)    ✓       ✓       ✓
Real-time spectrum display      ✓       ✓       ✓
Advisory frequency + severity   ✓       ✓       ✓
Note name / pitch translation   ✓       ✓       ✓
GEQ band indication            ✓       ✓       ✓
Active advisory limit           5       ∞       ∞
PEQ frequency/gain/Q           ✗       ✓       ✓
Shelf recommendations          ✗       ✓       ✓
MINDS adaptive depth           ✗       ✓       ✓
Session recording/playback     ✗       ✓       ✓
Export (PDF/CSV/JSON/TXT)      ✗       ✓       ✓
Room profiles                  ✗       20      ∞
Calibration export             ✗       ✓       ✓
Spectral waterfall             ✗       ✓       ✓
Early warning system           ✗       ✓       ✓
Feedback history panel         ✗       ✓       ✓
Algorithm status bar           ✗       ✓       ✓
Advanced settings              ✗       ✓       ✓
Multi-language                 ✗       ✓       ✓
Multi-channel (up to 16)      ✗       ✗       ✓
Cross-channel correlation      ✗       ✗       ✓
Mixer integration              ✗       ✗       ✓
Auto-EQ application            ✗       ✗       ✓
Companion module               ✗       ✗       ✓
Historical analytics           ✗       ✗       ✓
Team collaboration             ✗       ✗       ✓
API access                     ✗       ✗       ✓
Custom branding                ✗       ✗       ✓
```

### 4.3 Conversion Triggers

Key moments where free users experience the value of upgrading:

1. **"You caught 6 feedback frequencies — upgrade to track unlimited"** — hitting the 5-advisory cap during a show
2. **"That was a great session — save it for next time?"** — end-of-session prompt to save/export
3. **"This frequency rang 3 times tonight — see the pattern"** — teaser of historical analytics
4. **"Recommended: -4.2dB at 2,512 Hz, Q=8.3"** — showing the recommendation exists but blurring the details
5. **"Your room has consistent problems at 800 Hz and 3.15 kHz"** — room profile teaser

---

## 5. Revenue Streams

### 5.1 Primary Revenue: Subscriptions

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| Free users (cumulative) | 5,000 | 20,000 | 50,000 |
| Free → Pro conversion rate | 5% | 6% | 7% |
| Pro subscribers | 250 | 1,200 | 3,500 |
| Pro ARPU (monthly) | $8.50 | $8.50 | $8.50 |
| Pro ARR | $25,500 | $122,400 | $357,000 |
| Pro → Enterprise conversion | 10% | 12% | 15% |
| Enterprise subscribers | 25 | 144 | 525 |
| Enterprise ARPU (monthly) | $25 | $25 | $25 |
| Enterprise ARR | $7,500 | $43,200 | $157,500 |
| **Total subscription ARR** | **$33,000** | **$165,600** | **$514,500** |

*Conservative estimates. ARPU accounts for discounts (church/education/annual).*

### 5.2 Secondary Revenue: Add-Ons

| Add-On | Year 1 Units | Year 2 Units | Year 3 Units | Revenue |
|--------|-------------|-------------|-------------|---------|
| Desktop App ($49.99) | 50 | 200 | 500 | $37,450 cumulative |
| Training Mode ($19.99) | 30 | 150 | 400 | $11,594 cumulative |
| Venue Reports ($14.99) | 20 | 200 | 800 | $15,290 cumulative |
| Lifetime Pro ($299) | 10 | 30 | 50 | $26,910 cumulative |

### 5.3 Tertiary Revenue: Partnerships & Services

| Stream | Year 1 | Year 2 | Year 3 | Notes |
|--------|--------|--------|--------|-------|
| **Affiliate partnerships** | $500 | $5,000 | $20,000 | Measurement mics, audio interfaces, mixers |
| **Training courses** | $0 | $10,000 | $30,000 | "Master Feedback Control" video course ($49-99) |
| **Consulting** | $0 | $5,000 | $20,000 | Venue-specific analysis reports ($200-500) |
| **API licensing** | $0 | $0 | $10,000 | Third-party integration fees |
| **Data licensing** | $0 | $0 | $5,000 | Anonymized spectral data for acoustic research |

### 5.4 Revenue Summary

| Year | Subscriptions | Add-Ons | Partnerships | **Total** |
|------|--------------|---------|-------------|-----------|
| Year 1 | $33,000 | $5,000 | $500 | **$38,500** |
| Year 2 | $165,600 | $25,000 | $20,000 | **$210,600** |
| Year 3 | $514,500 | $50,000 | $85,000 | **$649,500** |

---

## 6. Go-To-Market Strategy

### 6.1 Launch Strategy

#### Pre-Launch (Current → v1.0)

1. **Build in public** — share development updates on X/Twitter, r/livesound, ProSoundWeb forums
2. **Beta access list** — collect emails from interested sound engineers
3. **Content marketing** — write articles about feedback detection algorithms, DSP education
4. **Community engagement** — answer feedback-related questions on forums, link to DWA as tool

#### Launch (v1.0)

1. **Product Hunt launch** — strong PWA story, "no install" angle
2. **Hacker News** — technical audience appreciates academic DSP, open architecture
3. **r/livesound, r/audioengineering** — primary communities
4. **ProSoundWeb forums** — most active live sound community
5. **Church tech communities** — Worship Sound Guy, Church Sound Magazine, r/churchtechpeople
6. **YouTube demo videos** — show real-world feedback detection in action

#### Post-Launch Growth

1. **SEO** — target "feedback frequency finder", "ring out PA", "feedback detector app", "live sound EQ tool"
2. **YouTube education series** — "Understanding Acoustic Feedback" series drives organic traffic
3. **Partner with worship tech influencers** — demos, reviews, tutorials
4. **Conference presence** — NAMM, InfoComm, WFX (Worship Facilities Expo) — demo booth or talks
5. **Referral program** — "Give a friend 1 month free Pro, get 1 month free" for Pro subscribers

### 6.2 Channel Strategy

| Channel | Target Segment | Cost | Expected Impact |
|---------|---------------|------|-----------------|
| **Organic (SEO/content)** | All | Low ($0-500/mo content) | High (long-term) |
| **Reddit/forums** | Engineers, enthusiasts | Free (time) | Medium |
| **YouTube** | All | Low ($200-500/video) | High |
| **Church networks** | Worship teams | Low (partnerships) | Very High |
| **Pro audio retailers** | Engineers | Medium (affiliate rev share) | Medium |
| **Conference demos** | Enterprise/integrators | High ($2-5K/event) | Medium |
| **Google Ads** | Search intent | Medium ($500-2K/mo) | Medium |
| **Email newsletter** | Existing users | Low ($50/mo tool cost) | High (retention) |

### 6.3 Positioning Statements

**For church worship teams:**
> "Stop fighting feedback. DoneWell Audio tells you exactly which frequency is ringing, which EQ band to cut, and how deep — so your volunteers can sound like pros."

**For freelance engineers:**
> "Your pocket-sized feedback analysis toolkit. No hardware to carry, no plugin host to set up. Open your phone, detect feedback, get EQ recommendations instantly."

**For system engineers:**
> "Monitor 16 channels, control your mixer EQ remotely, and track feedback patterns across shows. DoneWell Audio integrates with your Behringer, Yamaha, or Dante system."

**For educators:**
> "Teach acoustic feedback with real-time analysis. Students see exactly how feedback develops, which algorithms detect it, and why specific EQ corrections work."

---

## 7. Financial Projections

### 7.1 Cost Structure

| Category | Year 1/mo | Year 2/mo | Year 3/mo | Notes |
|----------|----------|----------|----------|-------|
| **Hosting (Vercel Pro)** | $20 | $50 | $150 | Scales with traffic |
| **Supabase (auth + DB)** | $25 | $75 | $200 | User accounts, sessions |
| **Sentry** | $26 | $26 | $80 | Error reporting |
| **Domain + SSL** | $3 | $3 | $3 | donewellaudio.com |
| **Email (Resend/Postmark)** | $0 | $20 | $50 | Transactional emails |
| **CDN/assets** | $0 | $10 | $30 | Static assets |
| **Payment processing** | Variable | Variable | Variable | Stripe: 2.9% + $0.30 |
| **Development tools** | $50 | $100 | $200 | AI subscriptions, CI/CD |
| **Total fixed costs** | **~$130/mo** | **~$290/mo** | **~$720/mo** |

### 7.2 Unit Economics

| Metric | Pro ($9.99/mo) | Enterprise ($29.99/mo) |
|--------|----------------|----------------------|
| **ARPU** (after discounts) | ~$8.50/mo | ~$25/mo |
| **Gross margin** | ~90% (minimal COGS) | ~85% (mixer bridge infra) |
| **CAC** (target) | <$20 | <$100 |
| **LTV** (12-month avg retention) | ~$102 | ~$300 |
| **LTV:CAC ratio** | >5:1 | >3:1 |
| **Payback period** | <3 months | <4 months |

### 7.3 Break-Even Analysis

- **Monthly fixed costs:** ~$130 (Year 1)
- **Break-even subscribers:** 16 Pro subscribers OR 6 Enterprise subscribers
- **Expected timeline to break-even:** Month 2-3 (very achievable with 5,000 free users and 5% conversion)

---

## 8. Implementation Plan

### 8.1 Payment Infrastructure

**Recommended: Stripe**

1. **Stripe Checkout** — hosted payment page (PCI-compliant, no card handling)
2. **Stripe Billing** — subscription management, invoicing, proration
3. **Stripe Customer Portal** — self-service subscription management
4. **Stripe Webhooks** — sync subscription status to Supabase

**Implementation files:**
- `app/api/v1/stripe/webhook/route.ts` — Stripe webhook handler
- `app/api/v1/stripe/checkout/route.ts` — Create checkout session
- `app/api/v1/stripe/portal/route.ts` — Customer portal redirect
- `lib/stripe/` — Stripe client, price IDs, subscription helpers
- `types/subscription.ts` — Subscription types, tier definitions
- `hooks/useSubscription.ts` — Client-side subscription state

### 8.2 User Authentication

**Recommended: Supabase Auth**

1. **Email + password** — standard signup
2. **Google OAuth** — frictionless for personal Gmail users
3. **Magic link** — passwordless for tech-averse church volunteers
4. **Anonymous upgrade** — start free without account, prompted to create account when hitting Pro features

**Implementation files:**
- `lib/auth/supabaseClient.ts` — Supabase client initialization
- `lib/auth/authHelpers.ts` — Auth utility functions
- `contexts/AuthContext.tsx` — Authentication state context
- `hooks/useAuth.ts` — Auth hook with login/logout/signup
- `components/analyzer/AuthDialog.tsx` — Login/signup modal
- `middleware.ts` — Route protection for Pro/Enterprise features

### 8.3 Feature Gating Implementation

```typescript
// types/subscription.ts
export type SubscriptionTier = 'free' | 'pro' | 'enterprise'

export interface UserSubscription {
  tier: SubscriptionTier
  status: 'active' | 'past_due' | 'canceled' | 'trialing'
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
}

// Usage in components:
// const { tier } = useSubscription()
// if (tier === 'free') { showUpgradePrompt() }
```

**Gating pattern:** Check tier in the hook/context, not in individual components. Components call `useSubscription()` and conditionally render upgrade prompts.

### 8.4 Implementation Priority

| # | Task | Effort | Dependency | Revenue Impact |
|---|------|--------|-----------|----------------|
| 1 | Stripe integration | 3-5 days | None | Direct — enables payment |
| 2 | Supabase Auth | 3-5 days | None | Direct — enables accounts |
| 3 | Subscription context + tier gating | 2-3 days | 1, 2 | Direct — enables gating |
| 4 | Session recording + cloud storage | 5-7 days | 2 | High — key Pro feature |
| 5 | Upgrade prompts at gate points | 2-3 days | 3 | High — drives conversion |
| 6 | Customer portal + billing management | 1-2 days | 1 | Medium — reduces churn |
| 7 | Church/education discount flow | 1-2 days | 1, 3 | Medium — captures segment |
| 8 | Stripe webhooks + status sync | 2-3 days | 1, 2 | High — payment reliability |

---

*This monetization strategy was developed based on competitive analysis of the pro audio market, SaaS pricing best practices, and the unique positioning of DoneWell Audio as a PWA-based feedback detection tool. Revenue projections are conservative estimates based on typical B2C SaaS metrics in niche technical markets.*
