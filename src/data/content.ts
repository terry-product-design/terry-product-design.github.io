// All homepage copy lives here — edit text, links and metrics without touching layout code.
import portrait from '../assets/img/portrait.png';
import idekuSidebar from '../assets/img/work-ideku-sidebar.png';
import imslpApp from '../assets/img/work-imslp-app.png';
import cathayLife from '../assets/img/work-cathay-life.jpg';
import imslpSearch from '../assets/img/work-imslp-search.png';
import myReward from '../assets/img/work-myreward.png';
import aiBackend from '../assets/img/other-ai-backend.png';
import homebank from '../assets/img/other-homebank.png';
import aiNeeds from '../assets/img/other-ai-needs.png';
import approvals from '../assets/img/other-approvals.png';
import policyLoan from '../assets/img/other-policy-loan.png';
import worklinkSite from '../assets/img/other-worklink-site.png';
import lecture from '../assets/img/exp-lecture.jpg';
import bookclub from '../assets/img/exp-bookclub.png';
import workshop from '../assets/img/exp-workshop.jpg';
import podcast from '../assets/img/exp-podcast.jpg';

// Case-study pages live under /work/.
const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');

export const site = {
  name: 'Terry Wu',
  role: 'Senior Product Designer',
  location: 'Taipei, Taiwan',
  timezone: 'Asia/Taipei',
  title: 'Terry Wu — Senior Product Designer',
  description:
    'Senior Product Designer with 9 years of experience designing merchant platforms, fintech products, and professional tools. I simplify complex workflows through research, systems thinking, and product strategy.',
  linkedin: 'https://www.linkedin.com/in/terry-productdesigner',
  resume:
    'https://docs.google.com/document/d/1zlOc0h5nrtdqxVmKv9UOwDbXhu6U9RceZKKqledvpHo/edit?usp=sharing',
};

export const hero = {
  // "complex" and "simple" are animated words — keep them in the sentence.
  lines: ['I design complex', 'products that make', 'work feel simple.'],
  intro:
    'Senior Product Designer with 9 years of experience designing merchant platforms, fintech products, and professional tools.',
  // Terms from real projects. In the hero they start tangled and get organised as you scroll.
  systemLabels: [
    'Onboarding', 'POS', 'Menu', 'Settlement', 'Remittance', 'Rewards',
    'Claims', 'Policy loan', 'Search', 'Annotation', 'Recording', 'Approvals',
    'Attendance', 'Diagnostics', 'Permissions', 'Reports',
  ],
};

export const about = {
  portrait,
  statement:
    "Hi, I'm Terry — a product designer in Taipei. For nine years I've designed merchant platforms, fintech products and professional tools, aligning user needs with business goals so complex work feels simple.",
  body:
    'I specialize in user-centered design and strategic communication. I simplify complex workflows and narratives through thoughtful research, and I’m passionate about creating practical, meaningful digital experiences.',
  stats: [
    { value: 9, prefix: '', suffix: '+', label: 'Years designing\ndigital products' },
    { value: 5, prefix: '', suffix: '', label: 'Product teams, from\nbanking to SaaS' },
    { value: 130, prefix: '+', suffix: '%', label: 'App users\nCathay Life' },
    { value: 70, prefix: '+', suffix: '%', label: 'Search conversion\nIMSLP' },
  ],
  pillars: [
    {
      key: 'research',
      title: 'Research',
      text: 'Finding where workflows really break — through interviews, usability testing and data, before a single pixel is pushed.',
    },
    {
      key: 'systems',
      title: 'Systems thinking',
      text: 'Turning fragmented interfaces into modular systems and service models that scale across web and app.',
    },
    {
      key: 'strategy',
      title: 'Product strategy',
      text: 'Aligning user needs with business goals, and proving it with outcomes teams can measure.',
    },
  ],
};

export const marquee = {
  domains: ['Merchant platforms', 'Fintech', 'Insurance', 'Music tech', 'B2B SaaS', 'AI tools'],
  teams: ['IDEKU', 'ACUE', 'IMSLP', 'CTBC Bank', 'Cathay Financial Holdings', 'WorkLink'],
};

export type Metric = {
  label: string;
  value: number;
  prefix: string;
  suffix: string;
  /** Optional "before" value, rendered as from → value */
  from?: number;
};

export const works: {
  slug: string;
  client: string;
  title: string;
  summary: string;
  tags: string[];
  metrics: Metric[];
  quote?: string;
  image: ImageMetadata;
  accent: string;
  href: string;
}[] = [
  {
    slug: 'ideku_sidebar',
    client: 'IDEKU',
    title: 'Rebuilding Navigation Around How Merchants Work',
    summary:
      'Restructured a restaurant SaaS back office from 24 top-level entries to 14 — organized by merchant tasks, then validated in a comparative usability test.',
    tags: ['Web · B2B SaaS', 'Information architecture', 'Usability testing'],
    metrics: [
      { label: 'Direct task completion', from: 46, value: 77, prefix: '', suffix: '%' },
      { label: 'Participants preferred the new sidebar', value: 8, prefix: '', suffix: '/8' },
    ],
    image: idekuSidebar,
    accent: '#e5484d',
    href: `${BASE}work/ideku-sidebar/`,
  },
  {
    slug: 'imslp_app',
    client: 'IMSLP',
    title: 'Carrying Your Practice Room in Your Device',
    summary:
      'Defined and delivered a portable score-reading tool from the ground up, integrating annotation and recording features — tailored for iPad-based practice sessions.',
    tags: ['iPad app', '0 → 1', 'Music tech'],
    metrics: [],
    quote: 'Early feedback from the classical music community affirmed the project’s value and direction.',
    image: imslpApp,
    accent: '#5b6cff',
    href: `${BASE}work/imslp-app/`,
  },
  {
    slug: 'mml',
    client: 'Cathay Life',
    title: 'Redesigning Insurance for a Pandemic Era',
    summary:
      'Redesigned the homepage into a data-driven, personalized interface, increasing the relevance of daily insurance actions.',
    tags: ['Mobile app', 'Personalization', 'Insurance'],
    metrics: [
      { label: 'App users', value: 130, prefix: '+', suffix: '%' },
      { label: 'User satisfaction', value: 15, prefix: '+', suffix: '%' },
    ],
    image: cathayLife,
    accent: '#2fbf7f',
    href: `${BASE}work/cathay-life/`,
  },
  {
    slug: 'imslp_web',
    client: 'IMSLP',
    title: 'Finding Music Again — IMSLP’s New Search Experience',
    summary:
      'Simplified the search flow and UI to help musicians find scores faster, with improved metadata logic to support discovery.',
    tags: ['Web', 'Search & discovery', 'Metadata'],
    metrics: [
      { label: 'Homepage → work/composer conversion', from: 15, value: 90, prefix: '', suffix: '%' },
      { label: 'Search task time', value: 50, prefix: '−', suffix: '%' },
    ],
    image: imslpSearch,
    accent: '#e39a62',
    href: `${BASE}work/imslp-web/`,
  },
  {
    slug: 'mr',
    client: 'Cathay MyReward',
    title: 'Making Points a Daily Habit — From Finance to Lifestyle',
    summary:
      'Reframed a financial rewards app into a lifestyle platform, simplifying access to perks and everyday usage.',
    tags: ['Mobile app', 'Rewards', 'Lifestyle'],
    metrics: [
      { label: 'Monthly point usage', value: 20, prefix: '+', suffix: '%' },
      { label: 'Active users tried a lifestyle service in year one', value: 10, prefix: '~', suffix: '%' },
    ],
    image: myReward,
    accent: '#3ccf9a',
    href: `${BASE}work/myreward/`,
  },
];

export const experience = [
  {
    period: 'Oct 2025 — Sep 2026',
    company: 'IDEKU',
    role: 'Senior Product Designer',
    tags: ['Merchant Portal', 'POS'],
    text: 'Designed the backend experience for a restaurant SaaS platform, from merchant onboarding to daily operations — using AI tools to prototype and validate flows rapidly.',
  },
  {
    period: 'Sep 2023 — Sep 2025',
    company: 'ACUE',
    role: 'Lead Product Designer',
    tags: ['IMSLP Web & App', 'Dell AI', 'ACUE Service Model'],
    text: 'Redesigned IMSLP into a full product ecosystem for classical musicians. Led end-to-end design across web and app, and introduced modular service offerings to improve clarity and reduce management costs.',
  },
  {
    period: 'Jun 2023 — Aug 2023',
    company: 'CTBC Bank',
    role: 'Senior Product Designer',
    tags: ['HomeBank App'],
    text: 'Worked on HomeBank App’s key features. Simplified cross-border remittance flows and optimized the credit card rewards experience to improve usability and engagement.',
  },
  {
    period: 'Aug 2019 — Jun 2023',
    company: 'Cathay Financial Holdings',
    role: 'UX Designer',
    tags: ['Cathay Life App', 'MyReward App', 'Tree Lifestyle Services'],
    text: 'Led UX strategy for the Cathay Life App, moving claims, contracts and policy loans online. Conducted user research and cross-functional collaboration to address pain points and enhance usability.',
  },
  {
    period: 'Jul 2017 — Jul 2019',
    company: 'WorkLink',
    role: 'UI/UX Designer',
    tags: ['WorkLink Platform', 'Product Marketing Website'],
    text: 'Redesigned WorkLink’s product marketing site (+19% trial signups). Designed HR tools and time-tracking features across web and mobile for enterprise use.',
  },
];

export const otherWorks = [
  {
    title: 'Intelligent AI Issue Response Backend',
    tag: 'AI · Internal platform',
    text: 'Combined hardware logic with UX to guide internal teams toward user-centered design. Built streamlined workflows and friendly UIs for efficient real-world AI application.',
    image: aiBackend,
  },
  {
    title: 'HomeBank — Rewards Redesign',
    tag: 'Fintech · CTBC Bank',
    text: 'Users struggled to understand the link between rewards and discounts. I redesigned the module for intuitive browsing and simpler redemption — reducing layers from three clicks to one.',
    image: homebank,
  },
  {
    title: 'AI-Powered Real-Time Needs Analysis',
    tag: 'AI · Diagnostics',
    text: 'Identified practical AI use cases and redesigned flows to simplify diagnostics. Enabled one-click issue reporting through real-time suggestions, improving speed and accuracy.',
    image: aiNeeds,
  },
  {
    title: 'Unified UX for Approvals & Attendance',
    tag: 'B2B SaaS · WorkLink',
    text: 'Led the effort to unify fragmented interface styles. Improved modal behaviors and exception flows — failed approvals, time restrictions — for better usability and visual consistency.',
    image: approvals,
  },
  {
    title: 'Online Policy Loan Application',
    tag: 'Insurance · Cathay Life',
    text: 'Simplified the application process with clearer visuals and a guidance mechanism. Post-launch testing showed strong satisfaction and an increase in actual applications.',
    image: policyLoan,
  },
  {
    title: 'WorkLink Website Redesign',
    tag: 'Marketing site · WorkLink',
    text: 'Redesigned the SaaS site to increase trial sign-ups and lower bounce rate. Refined IA and UI from internal insights, adding multilingual support for global users.',
    image: worklinkSite,
  },
];

export const explorations = {
  lead: ['Through different pursuits,', 'I uncover who I might become.'],
  items: [
    {
      kind: 'Design lectures',
      title: 'Design Culture Shake',
      text: 'I led a design lecture event, inviting international designers to share their work. We used Gather to build culturally themed virtual rooms for a more immersive experience.',
      note: 'I hosted the event myself to make sure everyone had a good time.',
      image: lecture,
      alt: 'Pixel-art virtual venue built in Gather for the design lecture event',
    },
    {
      kind: 'Book club',
      title: 'Inclusive Design',
      text: 'I invited designers from different product teams to study Google Material Design research, sharing inclusive design concepts and examples with the team.',
      note: 'I shared how adjusting font grade changes perceived weight across light and dark modes.',
      image: bookclub,
      alt: 'Abstract violet illustration of a head silhouette',
    },
    {
      kind: 'Workshop',
      title: 'Reborn Lecturer',
      text: 'I lead workshops that help non-UX practitioners and students experience the design thinking process first-hand.',
      note: 'Sharing design is different from shipping projects — it keeps me reflecting on my own practice.',
      image: workshop,
      alt: 'Terry speaking to students during a design thinking workshop',
    },
    {
      kind: 'Podcast',
      title: 'Fintech Store',
      text: 'On Cathay’s in-house podcast, I shared my path from visual design to UI/UX — the hurdles of switching careers, and how I worked through them.',
      note: 'Recording taught me to listen to the rhythm of my own speech — something entirely new.',
      image: podcast,
      alt: 'Neon-style cover art for the Fintech Store podcast episode',
    },
  ],
};

export const closing = {
  lines: ['Let’s make complex', 'work feel simple.'],
  quote: 'Design is inspired by the ordinary moments — work and life go hand in hand.',
};
