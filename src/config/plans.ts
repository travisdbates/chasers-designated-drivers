export interface Plan {
  id: string;
  name: string;
  description: string;
  price: string;
  priceNumeric: number; // For calculations and payment processing
  priceSubtext: string;
  features: string[];
  popular: boolean;
  category: 'individual' | 'joint' | 'family' | 'business' | 'corporate';
  ctaText: string;
  ctaUrl: string;
  // For SMS/Email templates
  emailSubject: string;
  smsMessage: string;
  // Billing information
  billingCycle: 'monthly' | 'annual';
  tripFee: number;
  minimumCommitment?: string;
}

export const MEMBERSHIP_PLANS: Record<string, Plan> = {
  'standard-individual': {
    id: 'standard-individual',
    name: 'Standard Individual',
    description: 'Safe, on-demand transportation home',
    price: '$69.99',
    priceNumeric: 69.99,
    priceSubtext: '/month + $40 trip fee per ride',
    features: [
      'Unlimited ride requests',
      '$40 trip fee per ride (plus gratuity)',
      'Covers the member only',
      '3PM - 3AM availability, 7 days a week',
      'Service available outside normal hours (by appointment)',
      'Pay by cash or charge to account',
      '3-month minimum commitment'
    ],
    popular: false,
    category: 'individual',
    ctaText: 'Join Standard Plan',
    ctaUrl: '/checkout/individual?plan=standard-individual',
    emailSubject: 'Welcome to Chasers DD - Standard Individual Plan',
    smsMessage: 'Welcome to Chasers DD! Your Standard Individual plan ($69.99/month) is now active. Call (480) 695-3659 for rides 3PM-3AM daily.',
    billingCycle: 'monthly',
    tripFee: 40,
    minimumCommitment: '3-month minimum commitment'
  },

  'individual': {
    id: 'individual',
    name: 'Individual Premier',
    description: 'Added flexibility and perks for frequent riders',
    price: '$119.99',
    priceNumeric: 119.99,
    priceSubtext: '/month + $40 trip fee per ride',
    features: [
      'Everything in Standard Plan, plus:',
      'Ability to request driver for friend/client (must be present)',
      'Unlimited ride requests',
      'Covers you alone',
      '3PM - 3AM availability, 7 days a week',
      'Service available outside normal hours (by appointment)',
      'Pay by cash or charge to account'
    ],
    popular: true,
    category: 'individual',
    ctaText: 'Join Premier Plan',
    ctaUrl: '/checkout/individual?plan=individual',
    emailSubject: 'Welcome to Chasers DD - Individual Premier Plan',
    smsMessage: 'Welcome to Chasers DD Premier! Your Individual Premier plan ($119.99/month) is active. Enhanced flexibility included. Call (480) 695-3659.',
    billingCycle: 'monthly',
    tripFee: 40
  },

  'joint': {
    id: 'joint',
    name: 'Joint Plan',
    description: 'Reliable transportation for two people',
    price: '$89.99',
    priceNumeric: 89.99,
    priceSubtext: '/month + $40 trip fee per ride',
    features: [
      'Unlimited ride requests',
      '$40 trip fee per ride (plus gratuity)',
      'Covers member and one additional person',
      '3PM - 3AM availability, 7 days a week',
      'Service available outside normal hours (by appointment)',
      'Pay by cash or charge to account',
      '3-month minimum commitment'
    ],
    popular: false,
    category: 'joint',
    ctaText: 'Join Joint Plan',
    ctaUrl: '/checkout/joint?plan=joint',
    emailSubject: 'Welcome to Chasers DD - Joint Plan',
    smsMessage: 'Welcome to Chasers DD! Your Joint plan ($89.99/month) covers 2 people. Call (480) 695-3659 for rides 3PM-3AM daily.',
    billingCycle: 'monthly',
    tripFee: 40,
    minimumCommitment: '3-month minimum commitment'
  },

  'joint-premier': {
    id: 'joint-premier',
    name: 'Joint Premier',
    description: 'Enhanced flexibility and premium access for couples',
    price: '$149.99',
    priceNumeric: 149.99,
    priceSubtext: '/month + $40 trip fee per ride',
    features: [
      'Everything in Joint Plan, plus:',
      'Ability to request driver for friend/client (one registered member must be present)',
      'Unlimited ride requests',
      'Covers member and one additional person',
      '3PM - 3AM availability, 7 days a week',
      'Service available outside normal hours (by appointment)',
      'Pay by cash or charge to account'
    ],
    popular: false,
    category: 'joint',
    ctaText: 'Join Joint Premier',
    ctaUrl: '/checkout/joint?plan=joint-premier',
    emailSubject: 'Welcome to Chasers DD - Joint Premier Plan',
    smsMessage: 'Welcome to Chasers DD Premier! Your Joint Premier plan ($189.99/month) covers 2 people with enhanced flexibility. Call (480) 695-3659.',
    billingCycle: 'monthly',
    tripFee: 40
  },

  'family': {
    id: 'family',
    name: 'Friends & Family',
    description: 'Perfect for up to 4 individuals in households or groups',
    price: '$249.99',
    priceNumeric: 249.99,
    priceSubtext: '/month + $40 trip fee per ride',
    features: [
      'Unlimited ride requests',
      '$40 trip fee per ride (plus gratuity)',
      'Covers up to 4 approved adult drivers',
      '3PM - 3AM availability, 7 days a week',
      'Service available outside normal hours (by appointment)',
      'Pay by cash or charge to account',
      'Only approved drivers may use the plan'
    ],
    popular: false,
    category: 'family',
    ctaText: 'Join Family Plan',
    ctaUrl: '/checkout/family',
    emailSubject: 'Welcome to Chasers DD - Friends & Family Plan',
    smsMessage: 'Welcome to Chasers DD! Your Friends & Family plan ($249.99/month) covers up to 4 people. Call (480) 695-3659 for rides 3PM-3AM daily.',
    billingCycle: 'monthly',
    tripFee: 40
  },

  'business': {
    id: 'business',
    name: 'Business Plan',
    description: 'Safe transportation for business staff and team members',
    price: '$599.99',
    priceNumeric: 599.99,
    priceSubtext: '/month + $40 trip fee per ride',
    features: [
      'Covers up to 10 approved individuals',
      'Unlimited ride requests',
      '$40 trip fee per ride (plus gratuity)',
      'Car Retrieval services (get vehicle from A to B)',
      'Chauffeur in your vehicles service',
      '3PM - 3AM availability, 7 days a week',
      'Pay by cash, card, or charge to company account'
    ],
    popular: false,
    category: 'business',
    ctaText: 'Join Business Plan',
    ctaUrl: '/checkout/business?plan=business',
    emailSubject: 'Welcome to Chasers DD - Business Plan',
    smsMessage: 'Welcome to Chasers DD Business! Your Business plan ($599.99/month) covers up to 10 employees. Call (480) 695-3659.',
    billingCycle: 'monthly',
    tripFee: 40
  },

  'business-premier': {
    id: 'business-premier',
    name: 'Business Premier',
    description: 'Flexibility to serve employees, clients and out-of-town guests',
    price: '$749.99',
    priceNumeric: 749.99,
    priceSubtext: '/month + $40 trip fee per ride',
    features: [
      'Everything in Business Plan, plus:',
      'Covers up to 10 approved individuals + unlimited client requests',
      'Ability to request rides for clients and guests',
      'No need for clients to be on approved list',
      '3PM - 3AM availability, 7 days a week',
      'Service available outside normal hours (by appointment)',
      'Pay by cash, card, or charge to company account'
    ],
    popular: false,
    category: 'business',
    ctaText: 'Join Business Premier',
    ctaUrl: '/checkout/business?plan=business-premier',
    emailSubject: 'Welcome to Chasers DD - Business Premier Plan',
    smsMessage: 'Welcome to Chasers DD Business Premier! Your plan ($749.99/month) covers employees + unlimited client requests. Call (480) 695-3659.',
    billingCycle: 'monthly',
    tripFee: 40
  },

  'corporate': {
    id: 'corporate',
    name: 'Corporate Premier',
    description: 'Professional business transportation',
    price: '$999.99',
    priceNumeric: 999.99,
    priceSubtext: '/month - Multi-employee coverage',
    features: [
      'Multi-employee coverage',
      'Executive-level discrete service',
      'Business event coordination',
      'Reduces company liability',
      'Professional representation',
      'Arizona local expertise'
    ],
    popular: false,
    category: 'corporate',
    ctaText: 'Join Corporate Plan',
    ctaUrl: '/checkout/corporate',
    emailSubject: 'Welcome to Chasers DD - Corporate Premier Plan',
    smsMessage: 'Welcome to Chasers DD Corporate! Your Corporate Premier plan ($999.99/month) provides executive-level service. Call (480) 695-3659.',
    billingCycle: 'monthly',
    tripFee: 0 // Corporate may have different pricing structure
  }
};

// Helper functions for easy access
export const getPlanById = (planId: string): Plan | undefined => {
  return MEMBERSHIP_PLANS[planId];
};

export const getPlansByCategory = (category: Plan['category']): Plan[] => {
  return Object.values(MEMBERSHIP_PLANS).filter(plan => plan.category === category);
};

export const getAllPlans = (): Plan[] => {
  return Object.values(MEMBERSHIP_PLANS);
};

export const getPopularPlans = (): Plan[] => {
  return Object.values(MEMBERSHIP_PLANS).filter(plan => plan.popular);
};

// For payment processing - get plan details for receipts/confirmations
export const getPlanDetailsForNotification = (planId: string) => {
  const plan = getPlanById(planId);
  if (!plan) return null;

  return {
    name: plan.name,
    price: plan.price,
    priceNumeric: plan.priceNumeric,
    features: plan.features,
    emailSubject: plan.emailSubject,
    smsMessage: plan.smsMessage,
    tripFee: plan.tripFee,
    billingCycle: plan.billingCycle
  };
};