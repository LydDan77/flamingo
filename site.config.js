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
// A showcase build at dist/three/: the same site, with the design switcher limited to Collection Three (and the partner
// entries). `hidden` keeps it out of the "Programs" list; `collections` is read by the {{#if collection:x}} tag.
const variants = {
  regen: {
    path: "regen",
    label: "Regenerative only",
    desc: "No NAD+ or peptide programs anywhere on the site",
    modules: { hormones: false, peptides: false, nad: false },
  },
  demo: {
    path: "demo",
    label: "Sample practice",
    short: "Sample practice",
    desc: "The five premium versions dressed as a fictional practice",
    modules: DEFAULT_MODULES,
    collections: ["three", "partners"],
    hidden: true,
    sample: true,
    brand: {
      name: "Northwind Regenerative Care",
      phone: "(541) 555-0142",
      phoneTel: "tel:+15415550142",
      email: "hello@northwindregen.example",
      address: "1130 Northwind Lane, Suite 200, Bend, OR 97703",
      hours: "Mon–Fri: 8AM–5PM · Sat by appointment",
      town: "Bend, Oregon",
      founder: { name: "Dr. Hannah Whitlock, MD", title: "Founder & Medical Director" },
      team: {
        director: { name: "Dr. Hannah Whitlock, MD", title: "Medical Director" },
        cmo: { name: "Dr. Samuel Okafor, MD", title: "Chief Medical Officer" },
        np: { name: "Grace Lindqvist, NP", title: "Lead Nurse Practitioner" },
      },
      coordinator: { first: "Maria", role: "care coordinator" },
      group: "Cascade Physician Partners",
      stats: { years: "9+", clinicians: "14", states: "6", patients: "1,800+" },
      pricing: { from: "$3,900", to: "$7,500" },
      reviews: { score: "4.9", count: "212" },
      stories: [
        { quote: "Grace explained every step before she did it, and the physician called the next morning to check in. I never felt rushed or sold to.", who: "Patricia M. | Oregon", what: "Knee care, at home" },
        { quote: "They told me on the first call that my hip was not a good fit and sent me back to my surgeon with notes. That honesty is why I trust them.", who: "Dale R. | Washington", what: "Consultation only" },
        { quote: "The price was on paper before I decided anything, and nobody chased me. I booked two weeks later on my own terms.", who: "Anne-Marie K. | Idaho", what: "Shoulder care, at home" },
      ],
    },
  },
  three: {
    path: "three",
    label: "Collection Three",
    short: "Collection Three",
    desc: "The five premium versions on their own link",
    modules: DEFAULT_MODULES,
    collections: ["three", "partners"],
    hidden: true,
  },
};

function make(modules, brand = {}) {
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
  programsPhrase: telehealth ? "hormones, peptides, and NAD+" : modules.nad ? "NAD+ and longevity plans" : "regenerative therapy",
  programsPhraseShort: telehealth ? "hormones · peptides · NAD+" : modules.nad ? "NAD+ · longevity" : "in your home",
  telehealthSentence: telehealth
    ? "Hormones, peptides, and NAD+ by video call, shipped to your door."
    : modules.nad
      ? "NAD+ and longevity plans by video call, shipped to your door."
      : "Consultations by video call, treatment in your home.",
  teamScope: telehealth ? "hormones, peptides, and regenerative care" : modules.nad ? "longevity plans and regenerative care" : "regenerative care",
  quoteScope: telehealth
    ? "regenerative therapy and hormones, peptides, and NAD+"
    : modules.nad
      ? "regenerative therapy and NAD+ plans"
      : "in-home regenerative therapy and physician oversight",
  protocolScope: telehealth
    ? "regenerative medicine and hormones, peptides, and NAD+"
    : modules.nad
      ? "regenerative medicine and NAD+ plans"
      : "stem cell, Wharton's Jelly and exosome plans",
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

  // People, numbers and prices that the pages print. Placeholders here; the "demo" variant fills them with a fictional
  // practice (see `variants.demo.brand`), and a client build fills them with real ones.
  town: "[City, State]",
  founder: { name: "[Founder Name], MD", title: "Founder & Medical Director" },
  team: {
    director: { name: "[Medical Director Name], MD", title: "Medical Director" },
    cmo: { name: "[Chief Medical Officer Name], MD", title: "Chief Medical Officer" },
    np: { name: "[Nurse Practitioner Name], NP", title: "Lead Nurse Practitioner" },
  },
  coordinator: { first: "[First name]", role: "care coordinator" },
  group: "[Medical Group Name]", // the physician group behind the protocols
  stats: { years: "XX+", clinicians: "XX+", states: "XX", patients: "X,XXX+" },
  pricing: { from: "$X,XXX", to: "$X,XXX" },
  reviews: { score: "X.X", count: "XXX" },
  stories: null, // the demo variant supplies three fictional, outcome-free stories; a client build supplies consented reviews

  // Where it hurts: the patient's own map of the site. Each has a page (<slug>.html) and sits in the nav and footer.
  conditions: [
    { slug: "knees", label: "Knees", plain: "your knee", icon: "bone", desc: "Stairs, chairs, the garden" },
    { slug: "hips", label: "Hips", plain: "your hip", icon: "activity", desc: "Walking, socks, sleeping on your side" },
    { slug: "shoulders", label: "Shoulders", plain: "your shoulder", icon: "heart-pulse", desc: "Reaching, lifting, sleeping" },
    { slug: "back-and-neck", label: "Back & neck", plain: "your back", icon: "gauge", desc: "Standing, turning, sitting through dinner" },
    { slug: "after-an-injury", label: "After an injury", plain: "the injury", icon: "timer", desc: "A tear or sprain that won't settle" },
    { slug: "before-surgery", label: "Before surgery", plain: "the joint", icon: "clipboard-check", desc: "A date on the calendar, and doubts" },
  ],

  // Sent here by your provider: one private page per referring clinician (from-<slug>.html, noindex). Fictional
  // sample referrers; a client build lists its real referral partners. `focus` names the condition page.
  referrers: [
    { slug: "dr-reyes", name: "Dr. Elena Reyes, DC", short: "Dr. Reyes", role: "chiropractor", practice: "Reyes Family Chiropractic", focus: "knees", focusWord: "knee", photo: "atelier-portrait-woman", pos: "center 15%", note: "Dr. Reyes usually sends us patients with knee wear who want to try a non-surgical option before a replacement, and who have already done the basics: weight, strengthening, and adjustments." },
    { slug: "marcus-hale", name: "Marcus Hale, DPT", short: "Marcus", role: "physical therapist", practice: "Hale Physical Therapy", focus: "shoulders", focusWord: "shoulder", photo: "atelier-portrait-man", pos: "center 15%", note: "Marcus refers shoulders that have plateaued in therapy: partial rotator cuff wear, pain at night, reaching overhead. He keeps working with you during and after." },
    { slug: "dr-natarajan", name: "Dr. Priya Natarajan, MD", short: "Dr. Natarajan", role: "family doctor", practice: "Natarajan Family Medicine", focus: "hips", focusWord: "hip", photo: "nurse-portrait", pos: "center 20%", note: "Dr. Natarajan sends us patients whose hip pain is changing how far they walk, and who want an honest opinion before they see a surgeon." },
    { slug: "your-provider", name: "Your provider", short: "Your provider", role: "clinician", practice: "", focus: "knees", focusWord: "joint", photo: "clinician-home-visit", pos: "center 30%", note: "Whoever sent you here knows your history. Bring their name to the call and we will keep them in the loop, with your permission." },
  ],

  // Brand (placeholder). While the name is still the placeholder, every page carries noindex and robots.txt disallows
  // crawling, so a demo deployment never shows up in Google as "Brand Name".
  name: "Brand Name",
  indexable: false, // set to true once the client's brand, legal copy and reviews are in place
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

  // Four calm items. Everything else lives inside the menus, the footer and the phone drawer.
  nav: [
    {
      label: "Where it hurts",
      href: "knees.html",
      match: ["conditions"],
      children: [
        { label: "Knees", href: "knees.html", desc: "Stairs, chairs, the garden", icon: "bone" },
        { label: "Hips", href: "hips.html", desc: "Walking, socks, sleeping on your side", icon: "activity" },
        { label: "Shoulders", href: "shoulders.html", desc: "Reaching, lifting, sleeping", icon: "heart-pulse" },
        { label: "Back & neck", href: "back-and-neck.html", desc: "Standing, turning, sitting through dinner", icon: "gauge" },
        { label: "After an injury", href: "after-an-injury.html", desc: "A tear or sprain that won't settle", icon: "timer" },
        { label: "Before surgery", href: "before-surgery.html", desc: "A date on the calendar, and doubts", icon: "clipboard-check" },
      ],
      featured: {
        title: "Sent here by your provider?",
        desc: "Start on the page made for their patients: what happens next, what it costs, who you will talk to.",
        href: "from-your-provider.html",
        cta: "Start there",
      },
    },
    {
      label: "Treatments",
      href: "services.html",
      match: ["regenerative", "nad", "hormones", "peptides"],
      children: [
        { label: "Stem Cell Therapy", href: "stem-cell-therapy.html", desc: "In-home care, physician-overseen", icon: "dna" },
        { label: "Wharton's Jelly", href: "whartons-jelly.html", desc: "Where the cells come from, and how they are tested", icon: "droplets" },
        { label: "Exosomes", href: "why-exosomes.html", desc: "The signals cells send each other", icon: "orbit" },
        { label: "NAD+ & longevity", href: "nad.html", desc: "By video call, shipped to your door", icon: "sparkles", module: "nad" },
        { label: "Hormones", href: "hormones.html", desc: "TRT and HRT by video call", icon: "flask", module: "hormones" },
        { label: "Peptide programs", href: "peptides.html", desc: "Recovery, weight, sleep, longevity", icon: "zap", module: "peptides" },
        { label: "How care works", href: "concierge-care-model.html", desc: "One team, one record, treatment at home", icon: "stethoscope" },
        { label: "All treatments", href: "services.html", desc: virtual ? "Every program, regenerative and by video call" : "Every program, in one place", icon: "layers" },
      ],
      featured: {
        title: "Not sure which treatment fits?",
        desc: "Book a free video call and a clinician will tell you honestly, including if none of them do.",
        href: "contact.html#book",
        cta: "Book a free video call",
      },
    },
    {
      label: "About",
      href: "about.html",
      match: ["about", "journal", "providers"],
      children: [
        { label: "Our team", href: "about.html", desc: "The clinicians, by name", icon: "info" },
        { label: "Our founder", href: "founder.html", desc: "Why we exist", icon: "user" },
        { label: "Why we're different", href: "why-were-different.html", desc: "What sets us apart", icon: "sparkles" },
        { label: "Patient stories", href: "testimonials.html", desc: "Real patients, with consent", icon: "star" },
        { label: "Journal", href: "journal.html", desc: "Plain-language guides to regenerative care", icon: "book-open" },
        { label: "For providers & partners", href: "for-providers.html", desc: "Refer a patient, or partner with us", icon: "users" },
      ],
      featured: {
        title: "What we will not promise",
        desc: "Where we draw the line, so you can decide with clear eyes.",
        href: "index.html#honesty",
        cta: "Read it",
      },
    },
    { label: "Contact", href: "contact.html", match: ["contact"] },
  ],

  footer: [
    {
      title: "Where it hurts",
      links: [
        { label: "Knees", href: "knees.html" },
        { label: "Hips", href: "hips.html" },
        { label: "Shoulders", href: "shoulders.html" },
        { label: "Back & neck", href: "back-and-neck.html" },
        { label: "After an injury", href: "after-an-injury.html" },
        { label: "Before surgery", href: "before-surgery.html" },
      ],
    },
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
        { label: "Journal", href: "journal.html" },
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
  ...brand,
};
}

module.exports = Object.assign(make(DEFAULT_MODULES), { make, variants, rootVariant });
