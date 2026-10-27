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
const DEFAULT_MODULES = {
  hormones: false, // hormones.html (TRT / HRT telehealth)
  peptides: false, // peptides.html (goal-based peptide programs)
  nad: true, // nad.html (NAD+ therapy and supplement protocols)
};

// ---------------------------------------------------------------------------
// Site variants. The root build (dist/) uses DEFAULT_MODULES. Every variant
// below is a complete second build of the whole site, every design version
// included, written to dist/<path>/ with its own module set. The design
// switcher lists them under "Programs" so a reviewer can flip between them
// on any page.
// ---------------------------------------------------------------------------
const rootVariant = { path: "", label: "Regenerative + NAD+", desc: "The full catalog: in-home regenerative care plus NAD+ & longevity" };
const variants = {
  regen: {
    path: "regen",
    label: "Regenerative only",
    desc: "No NAD+ or peptide programs anywhere on the site",
    modules: { hormones: false, peptides: false, nad: false },
  },
};

function make(modules) {
const notices = {
  californiaStemCell: true,
};

const telehealth = modules.hormones || modules.peptides; // prescription programs (compounded, shipped)
const virtual = telehealth || modules.nad; // any program delivered through telehealth at all
const pad = (n) => String(n).padStart(2, "0");
const num = {
  hormones: pad(4),
  peptides: pad(4 + (modules.hormones ? 1 : 0)),
  nad: pad(4 + (modules.hormones ? 1 : 0) + (modules.peptides ? 1 : 0)),
};

return {
  modules,
  notices,
  num, // service numbering that shifts when modules are off (used by the home tiles and services cards)

  // Copy fragments that change with the modules, so generic sentences stay true either way.
  // Three states: prescription programs on (hormones / peptides), NAD+ only, or regenerative care alone.
  programsPhrase: telehealth ? "hormones, peptides, and NAD+" : modules.nad ? "NAD+ and longevity protocols" : "regenerative therapy",
  programsPhraseShort: telehealth ? "hormones · peptides · NAD+" : modules.nad ? "NAD+ · longevity" : "in your home",
  telehealthSentence: telehealth
    ? "Hormones, peptides, and NAD+ through telehealth."
    : modules.nad
      ? "NAD+ and longevity protocols through telehealth."
      : "Consultations by telehealth, treatment in your home.",
  teamScope: telehealth ? "hormones, peptides, and regenerative care" : modules.nad ? "longevity protocols and regenerative care" : "regenerative care",
  quoteScope: telehealth
    ? "regenerative therapy and hormones, peptides, and NAD+"
    : modules.nad
      ? "regenerative therapy and NAD+ protocols"
      : "in-home regenerative therapy and physician oversight",
  protocolScope: telehealth
    ? "regenerative medicine and hormones, peptides, and NAD+"
    : modules.nad
      ? "regenerative medicine and NAD+ protocols"
      : "stem cell, Wharton's Jelly and exosome protocols",
  programCount: ["Three", "Four", "Five", "Six"][(modules.nad ? 1 : 0) + (modules.hormones ? 1 : 0) + (modules.peptides ? 1 : 0)],
  programScope: virtual ? "Regenerative and telehealth" : "In-home regenerative care",
  pillarCount: 3, // the home page always shows three pillars; which three depends on the modules
  virtual,
  href: {
    performance: modules.peptides ? "peptides.html" : modules.nad ? "nad.html" : "stem-cell-therapy.html",
    after40: modules.hormones ? "hormones.html" : "concierge-care-model.html",
    telehealth: modules.peptides ? "peptides.html" : modules.hormones ? "hormones.html" : modules.nad ? "nad.html" : "why-exosomes.html",
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
  tagline: virtual ? "Regenerative Medicine & Longevity Care" : "Regenerative Medicine, In Your Home",
  description: virtual
    ? "In-home regenerative therapy and nationwide telehealth for longevity care. One physician-led medical team, one patient record, one plan."
    : "In-home regenerative therapy from one physician-led medical team: stem cells, Wharton's Jelly and exosomes, delivered by a licensed nurse practitioner. One patient record, one plan.",
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
        { label: "All Services", href: "services.html", desc: virtual ? "Every program, regenerative and telehealth" : "Every program, in one place", icon: "layers" },
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
    { label: "NAD+", href: "nad.html", match: ["nad"], module: "nad" },
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
        { label: "NAD+ & Supplements", href: "nad.html", module: "nad" },
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
}

module.exports = Object.assign(make(DEFAULT_MODULES), { make, variants, rootVariant });
