export interface StandardMaster {
  slug: string;
  name: string;
  description: string;
  defaults: string[];
}

export const STANDARD_MASTERS: StandardMaster[] = [
  {
    slug: 'category',
    name: 'Category',
    description: 'General, OBC, SC, ST, EWS — used in admission forms and government compliance reports',
    defaults: ['General', 'OBC', 'SC', 'ST', 'EWS', 'Differently Abled'],
  },
  {
    slug: 'religion',
    name: 'Religion',
    description: 'Religion options for student profile and admission form',
    defaults: ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Parsi', 'Others'],
  },
  {
    slug: 'mother_tongue',
    name: 'Mother Tongue',
    description: 'Language spoken at home — required for some board-level reports',
    defaults: ['Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Punjabi', 'Kannada', 'Malayalam', 'Odia', 'English', 'Others'],
  },
  {
    slug: 'admission_category',
    name: 'Admission Category',
    description: 'Regular, EWS/RTE, Sports, Management quota and other admission routes',
    defaults: ['Regular', 'EWS / RTE', 'Sports Quota', 'NCC Quota', 'Minority Quota', 'Legacy / Alumni', 'Staff Ward', 'Management Quota'],
  },
  {
    slug: 'boarding_type',
    name: 'Boarding Type',
    description: 'Day Scholar, Boarder, Weekly Boarder — for hostel-enabled schools',
    defaults: ['Day Scholar', 'Boarder', 'Weekly Boarder', 'Day Boarder'],
  },
  {
    slug: 'diet_type',
    name: 'Diet Type',
    description: 'Dietary preferences for hostel and canteen planning',
    defaults: ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Jain', 'Gluten-Free', 'Nut-Free'],
  },
  {
    slug: 'disability_type',
    name: 'Disability Type',
    description: 'Visual, Hearing, Dyslexia, ADHD and other special needs categories',
    defaults: ['None', 'Visual Impairment', 'Hearing Impairment', 'Physical Disability', 'Dyslexia', 'ADHD', 'Autism Spectrum', 'Dyscalculia', 'Cerebral Palsy', 'Multiple Disabilities'],
  },
  {
    slug: 'stream',
    name: 'Stream',
    description: 'Academic stream for senior secondary — Science, Commerce, Arts, General',
    defaults: ['Science', 'Commerce', 'Arts', 'General'],
  },
  {
    slug: 'designation_type',
    name: 'Designation Type',
    description: 'PRT, TGT, PGT, HOD, Counselor and other staff designations',
    defaults: ['PRT', 'TGT', 'PGT', 'HOD', 'Counselor', 'Librarian', 'Special Educator', 'Sports Coach', 'Lab In-charge', 'Administrative Staff'],
  },
  {
    slug: 'employment_type',
    name: 'Employment Type',
    description: 'Permanent, Contractual, Guest Faculty, On Deputation',
    defaults: ['Permanent', 'Contractual', 'Temporary', 'Guest Faculty', 'On Deputation'],
  },
  {
    slug: 'teacher_cert',
    name: 'Teacher Certification',
    description: 'B.Ed, CTET, IB Certificate and other teaching qualifications',
    defaults: ['B.Ed', 'M.Ed', 'CTET', 'TET', 'STET', 'NTT', 'D.El.Ed', 'IB Certificate', 'Cambridge Endorsement', 'None'],
  },
  {
    slug: 'visa_type',
    name: 'Visa / Work Permit Type',
    description: 'Student Visa, Work Permit, OCI Card — for international staff and student tracking',
    defaults: ['Student Visa', 'Work Permit', 'Dependent Visa', 'OCI Card', 'PIO Card', 'Resident Permit', 'Not Applicable'],
  },
  {
    slug: 'fee_component',
    name: 'Fee Component',
    description: 'Tuition, Lab, Sports, Transport and other fee line-item categories',
    defaults: ['Tuition Fee', 'Admission Fee', 'Registration Fee', 'Development Fee', 'Lab Fee', 'Library Fee', 'Sports Fee', 'Transport Fee', 'Hostel Fee', 'Exam Fee', 'ID Card Fee', 'Annual Day Fee'],
  },
  {
    slug: 'scholarship_type',
    name: 'Scholarship Type',
    description: 'Merit, Sports, EWS, Staff Ward and other concession categories',
    defaults: ['Merit Scholarship', 'Sports Scholarship', 'Arts Scholarship', 'Financial Need', 'Staff Ward Concession', 'EWS / RTE', 'Alumni Legacy'],
  },
  {
    slug: 'income_bracket',
    name: 'Income Bracket',
    description: 'Annual family income ranges used for scholarship and EWS eligibility',
    defaults: ['Below ₹1 Lakh', '₹1–2.5 Lakh', '₹2.5–5 Lakh', '₹5–8 Lakh', '₹8–12 Lakh', 'Above ₹12 Lakh'],
  },
  {
    slug: 'board',
    name: 'Board',
    description: 'CBSE, ICSE, IB, Cambridge/IGCSE, State Boards — previous school board tracking',
    defaults: ['CBSE', 'ICSE', 'ISC', 'IB (PYP/MYP/DP/CP)', 'Cambridge / IGCSE', 'Maharashtra State Board', 'UP Board', 'TN Board', 'Karnataka Board', 'Gujarat Board', 'Others'],
  },
  {
    slug: 'ib_programme',
    name: 'IB Programme',
    description: 'PYP, MYP, DP, CP — IB programme stages for IB schools',
    defaults: ['PYP (Primary Years)', 'MYP (Middle Years)', 'DP (Diploma)', 'CP (Career-related)'],
  },
  {
    slug: 'house',
    name: 'House',
    description: 'School houses for inter-house competitions and points system',
    defaults: ['Red House', 'Blue House', 'Green House', 'Yellow House'],
  },
  {
    slug: 'transport_stop',
    name: 'Transport Stop',
    description: 'Bus stops with estimated pickup times for route management',
    defaults: [],
  },
  {
    slug: 'relationship',
    name: 'Relationship',
    description: 'Father, Mother, Guardian — parent-student relationship types',
    defaults: ['Father', 'Mother', 'Grandfather', 'Grandmother', 'Uncle', 'Aunt', 'Legal Guardian', 'Elder Sibling', 'Other'],
  },
  {
    slug: 'cas_category',
    name: 'CAS Category',
    description: 'Creativity, Activity, Service — IB Diploma CAS portfolio categories',
    defaults: ['Creativity', 'Activity', 'Service'],
  },
  {
    slug: 'learning_support',
    name: 'Learning Support',
    description: 'Level of learning support needed — None, Mild, IEP Required, etc.',
    defaults: ['None', 'Mild Support', 'Moderate Support', 'IEP Required', 'External Therapist'],
  },
  {
    slug: 'cambridge_pathway',
    name: 'Cambridge Pathway',
    description: 'Primary, Lower Secondary, IGCSE, O-Level, A-Level — Cambridge curriculum stages',
    defaults: ['Cambridge Primary', 'Cambridge Lower Secondary', 'IGCSE', 'O-Level', 'A-Level', 'AICE'],
  },
];

export const STANDARD_MASTERS_BY_SLUG = new Map(STANDARD_MASTERS.map(m => [m.slug, m]));
