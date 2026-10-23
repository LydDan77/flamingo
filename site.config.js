/*
 * Site-wide values used by build.js and the templates.
 * Edit here once; every page picks it up on the next build.
 */
module.exports = {
  name: "Regenerative Revival",
  tagline: "Stem Cell Therapy, Peptides & Longevity Medicine",
  description:
    "In-home stem cell therapy and nationwide telehealth for peptides, hormones, and NAD+. One physician-led medical team, one patient record, one plan for the best decade of your life.",
  url: "https://flamingo-regenerative-revival.vercel.app", // update when the custom domain is attached
  ogImage: "assets/img/og-image.jpg",

  phone: "612-453-3182",
  phoneTel: "tel:+16124533182",
  email: "info@regenerativerevival.com",
  address: "10000 Hwy 55, Ste 200, Plymouth, MN 55441",
  hours: "Mon–Fri: 9AM–6PM CST",

  // Primary conversion action: book a consultation (contact page form + phone).
  bookUrl: "contact.html#book",
  bookLabel: "Book a Free Consultation",
  // Secondary: the existing 2-minute routing quiz on the live Regenerative Revival site.
  quizUrl: "https://regenerativerevival.com/consult-router",
  quizLabel: "Take the 2-Minute Quiz",
  // Where "View & order" links for telehealth products go (existing product pages).
  shopBase: "https://regenerativerevival.com",
  portalUrl: "https://app.wizlo.com",

  social: {
    facebook: "https://www.facebook.com/regenerativerevival",
    instagram: "https://www.instagram.com/regenerativerevival",
    linkedin: "https://www.linkedin.com/company/regenerativerevival",
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
    { label: "Hormones", href: "hormones.html", match: ["hormones"] },
    {
      label: "Peptides",
      href: "peptides.html",
      match: ["peptides"],
      children: [
        { label: "BPC-157 / TB-500", href: "peptides.html#pain-recovery", desc: "Recovery, tissue repair & joint support", icon: "flask" },
        { label: "Semaglutide", href: "peptides.html#metabolic-reset", desc: "GLP-1 weight management, sublingual or injection", icon: "scale" },
        { label: "Tirzepatide", href: "peptides.html#metabolic-reset", desc: "Dual GIP/GLP-1 support", icon: "scale" },
        { label: "CJC-1295 / Ipamorelin", href: "peptides.html#sleep-recovery", desc: "Sleep, recovery & body composition", icon: "zap" },
        { label: "GHK-Cu", href: "peptides.html#longevity-cellular", desc: "Skin rejuvenation & cellular repair", icon: "sparkles" },
        { label: "All Peptide Programs", href: "peptides.html#programs", desc: "Browse by goal: weight, recovery, longevity", icon: "flask" },
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
        { label: "Founder: Seth Berge", href: "founder.html", desc: "Why Regenerative Revival exists", icon: "user" },
        { label: "Why We're Different", href: "why-were-different.html", desc: "What sets Regenerative Revival apart", icon: "sparkles" },
        { label: "Testimonials", href: "testimonials.html", desc: "Real results from real patients", icon: "star" },
      ],
      featured: {
        title: "One medical team. One plan.",
        desc: "Physician-led, NP-delivered care coordinated under Arora Health Group.",
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
        { label: "Hormones", href: "hormones.html" },
        { label: "Peptides", href: "peptides.html" },
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
        { label: "Patient Portal", href: "https://app.wizlo.com" },
        { label: "FAQ", href: "index.html#faq" },
        { label: "News", href: "https://regenerativerevival.com/news" },
      ],
    },
    {
      title: "Contact",
      links: [
        { label: "Patient Support", href: "contact.html" },
        { label: "Book a Consultation", href: "contact.html#book" },
        { label: "For Providers", href: "for-providers.html" },
        { label: "612-453-3182", href: "tel:+16124533182" },
      ],
    },
  ],
};
