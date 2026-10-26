/*
 * Site-wide values used by build.js and the templates.
 * Everything here is a PLACEHOLDER until the client's details arrive.
 * Edit once; every page picks it up on the next build.
 */

// ---------------------------------------------------------------------------
// Optional modules. Flip to true to publish the page, its navigation links,
// and every cross-reference on other pages. Off = fully hidden (not built,
// not in the sitemap, not linked anywhere).
// ---------------------------------------------------------------------------
const modules = {
  hormones: false, // hormones.html (TRT / HRT telehealth)
  peptides: false, // peptides.html (goal-based peptide programs)
};

// Legal notices. californiaStemCell prints the statutory notice (Cal. Health & Safety Code § 24185) on the regenerative
// therapy pages and the disclaimer page. Required for practices offering non-FDA-approved stem cell therapy in California.
const notices = {
  californiaStemCell: true,
};

const telehealth = modules.hormones || modules.peptides;
const pad = (n) => String(n).padStart(2, "0");
const num = {
  hormones: pad(4),
  peptides: pad(4 + (modules.hormones ? 1 : 0)),
  nad: pad(4 + (modules.hormones ? 1 : 0) + (modules.peptides ? 1 : 0)),
};

module.exports = {
  modules,
  notices,
  num, // service numbering that shifts when modules are off (used by the home tiles and services cards)

  // Copy fragments that change with the modules, so generic sentences stay true either way.
  programsPhrase: telehealth ? "hormones, peptides, and NAD+" : "NAD+ and longevity protocols",
  programsPhraseShort: telehealth ? "hormones · peptides · NAD+" : "NAD+ · longevity",
  telehealthSentence: telehealth ? "Hormones, peptides, and NAD+ through telehealth." : "NAD+ and longevity protocols through telehealth.",
  teamScope: telehealth ? "hormones, peptides, and regenerative care" : "longevity protocols and regenerative care",
  programCount: ["Three", "Four", "Five", "Six"][1 + (modules.hormones ? 1 : 0) + (modules.peptides ? 1 : 0)],
  pillarCount: 3 + (modules.hormones ? 1 : 0) + (modules.peptides ? 1 : 0),
  href: {
    performance: modules.peptides ? "peptides.html" : "nad.html",
    after40: modules.hormones ? "hormones.html" : "concierge-care-model.html",
    telehealth: modules.peptides ? "peptides.html" : modules.hormones ? "hormones.html" : "nad.html",
  },

  // Partner (buyer) overview. Shown only on partner-overview.html and in "partner view" (?partner=1). Never linked from the public site.
  partner: {
    program: "Business in a Box",
    purchase: "$100,000",
    purchaseNote: "One-time purchase price for the single-location business opportunity.",
    subscription: "$2,497",
    subscriptionTerm: "12-month term beginning at signing",
    productCredit: "$10,000",
    subscriptionFee: 2497, // used by the planning tool
    walkthroughUrl: "contact.html?path=provider#book",
    walkthroughLabel: "Book a 30-minute partner walkthrough",
  },

  // Brand (placeholder)
  name: "Brand Name",
  tagline: "Regenerative Medicine & Longevity Care",
  description:
    "In-home regenerative therapy and nationwide telehealth for longevity care. One physician-led medical team, one patient record, one plan.",
  url: "https://flamingo-regenerative-revival.vercel.app", // update when the client's domain is attached
  ogImage: "assets/img/og-image.png",

  // Contact (placeholders)
  phone: "(000) 000-0000",
  phoneTel: "tel:+10000000000",
  email: "hello@example.com",
  address: "123 Street Name, Suite 100, City, ST 00000",
  hours: "Mon–Fri: 9AM–5PM",

  // Primary conversion action: the on-site consultation form.
  bookUrl: "contact.html#book",
  bookLabel: "Book a Free Consultation",

  // Social (placeholders)
  social: {
    facebook: "#",
    instagram: "#",
    linkedin: "#",
  },

  nav: [
    {
      label: "Regenerative",
      href: "stem-cell-therapy.html",
      match: ["regenerative"],
      children: [
        { label: "Stem Cell Therapy", href: "stem-cell-therapy.html", desc: "In-home Wharton's Jelly regenerative care", icon: "dna" },
        { label: "Wharton's Jelly", href: "whartons-jelly.html", desc: "Source, science, and how it's delivered", icon: "droplets" },
        { label: "Why Exosomes", href: "why-exosomes.html", desc: "The signaling layer that drives repair", icon: "orbit" },
        { label: "Concierge Care Model", href: "concierge-care-model.html", desc: "NP-led, physician-overseen, in your home", icon: "stethoscope" },
        { label: "All Services", href: "services.html", desc: "Every program, regenerative and telehealth", icon: "layers" },
      ],
      featured: {
        title: "Not sure which therapy fits?",
        desc: "Book a free consultation and we'll route you to the right protocol and clinician.",
        href: "contact.html#book",
        cta: "Book a Consultation",
      },
    },
    { label: "Hormones", href: "hormones.html", match: ["hormones"], module: "hormones" },
    {
      label: "Peptides",
      href: "peptides.html",
      match: ["peptides"],
      module: "peptides",
      children: [
        { label: "Pain & Recovery", href: "peptides.html#pain-recovery", desc: "Tissue repair & joint support", icon: "activity" },
        { label: "Weight & Metabolic", href: "peptides.html#metabolic-reset", desc: "GLP-1 programs, sublingual or injection", icon: "scale" },
        { label: "Sleep & Recovery", href: "peptides.html#sleep-recovery", desc: "Growth hormone support & body composition", icon: "moon" },
        { label: "Longevity & Cellular", href: "peptides.html#longevity-cellular", desc: "Skin, mitochondria & cellular repair", icon: "sparkles" },
        { label: "All Peptide Programs", href: "peptides.html#programs", desc: "Browse by goal", icon: "flask" },
      ],
      featured: {
        title: "Not sure which peptide fits?",
        desc: "Pick a goal and we'll show the protocols our clinicians prescribe.",
        href: "peptides.html#programs",
        cta: "Browse Programs",
      },
    },
    { label: "NAD+", href: "nad.html", match: ["nad"] },
    { label: "For Providers", href: "for-providers.html", match: ["providers"] },
    {
      label: "About",
      href: "about.html",
      match: ["about"],
      children: [
        { label: "About Us", href: "about.html", desc: "Our mission, team & story", icon: "info" },
        { label: "Our Founder", href: "founder.html", desc: "Why we exist", icon: "user" },
        { label: "Why We're Different", href: "why-were-different.html", desc: "What sets us apart", icon: "sparkles" },
        { label: "Testimonials", href: "testimonials.html", desc: "Real results from real patients", icon: "star" },
      ],
      featured: {
        title: "One medical team. One plan.",
        desc: "Physician-led, NP-delivered care coordinated under one roof.",
        href: "concierge-care-model.html",
        cta: "How It Works",
      },
    },
    { label: "Contact", href: "contact.html", match: ["contact"] },
  ],

  footer: [
    {
      title: "Services",
      links: [
        { label: "Regenerative Therapy", href: "stem-cell-therapy.html" },
        { label: "Wharton's Jelly", href: "whartons-jelly.html" },
        { label: "Exosomes", href: "why-exosomes.html" },
        { label: "Hormones", href: "hormones.html", module: "hormones" },
        { label: "Peptides", href: "peptides.html", module: "peptides" },
        { label: "NAD+ & Supplements", href: "nad.html" },
      ],
    },
    {
      title: "About",
      links: [
        { label: "Medical Team", href: "about.html#team" },
        { label: "Our Founder", href: "founder.html" },
        { label: "Why We're Different", href: "why-were-different.html" },
        { label: "Concierge Care Model", href: "concierge-care-model.html" },
        { label: "Testimonials", href: "testimonials.html" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "How It Works", href: "index.html#how-it-works" },
        { label: "Financing & Payment Plans", href: "financing.html" },
        { label: "FAQ", href: "index.html#faq" },
        { label: "Journal", href: "index.html#journal" },
      ],
    },
    {
      title: "Contact",
      links: [
        { label: "Patient Support", href: "contact.html" },
        { label: "Book a Consultation", href: "contact.html#book" },
        { label: "For Providers", href: "for-providers.html" },
        { label: "(000) 000-0000", href: "tel:+10000000000" },
      ],
    },
  ],
};
