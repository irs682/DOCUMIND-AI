import { Link } from 'react-router-dom';
import { CheckCircle2, Sparkles, ArrowRight, Zap } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '$0',
    description: 'Perfect for trying DOCUMIND-AI with essential workflows.',
    features: ['Up to 50 documents', '1 knowledge base', 'Semantic search', 'Basic AI chat', 'Email support'],
    featured: false,
  },
  {
    name: 'Professional',
    price: '$49',
    description: 'For teams scaling their knowledge and collaboration workflows.',
    features: ['Unlimited documents', 'Unlimited knowledge bases', 'Advanced analytics', 'Agentic AI reports', 'Priority support', 'API access'],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'Advanced controls and security for larger organizations.',
    features: ['Everything in Professional', 'SSO and RBAC', 'Audit logs', 'Dedicated onboarding', 'Custom integrations', '24/7 support'],
    featured: false,
  },
];

const Pricing = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-linear-to-br from-slate-900 via-slate-800 to-indigo-900 px-6 py-20 sm:py-32 text-white">
        <div className="mx-auto max-w-7xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
            <Sparkles size={16} />
            Flexible pricing
          </p>
          <h1 className="mt-6 text-4xl font-bold sm:text-5xl">Plans for every team size</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">
            Start free, upgrade when you're ready. No credit card required.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className={`relative rounded-3xl overflow-hidden transition ${plan.featured ? 'border-2 border-indigo-500 bg-white shadow-2xl scale-105 lg:scale-100' : 'border border-slate-200 bg-white shadow-sm'}`}>
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">
                    <Zap size={12} fill="currentColor" />
                    Most popular
                  </span>
                </div>
              )}
              <div className="p-8 sm:p-10">
                <h2 className="text-2xl font-bold text-slate-900">{plan.name}</h2>
                <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
                
                <div className="mt-8 flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-slate-900">{plan.price}</span>
                  {plan.price !== 'Custom' && <span className="text-slate-600">/month</span>}
                </div>

                <Link to="/register" className={`mt-8 block w-full rounded-lg px-4 py-3 text-center text-sm font-bold transition ${
                  plan.featured
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg'
                    : 'border-2 border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}>
                  Get Started
                </Link>

                <div className="mt-8 space-y-4 border-t border-slate-200 pt-8">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-600" />
                      <span className="text-sm text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">Frequently asked questions</h2>
            <p className="mt-4 text-slate-600">Have questions about our pricing?</p>
          </div>
          <div className="mt-12 space-y-4">
            {[
              { q: "Can I upgrade or downgrade my plan?", a: "Yes, you can change your plan anytime. Changes take effect on your next billing cycle." },
              { q: "Do you offer annual billing?", a: "Yes, we offer 20% off when you pay annually. Contact our sales team for details." },
              { q: "What payment methods do you accept?", a: "We accept all major credit cards, PayPal, and bank transfers for enterprise accounts." },
              { q: "Is there a contract?", a: "No contracts. You can cancel your subscription anytime with no penalties." },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-lg border border-slate-200 bg-white p-6">
                <h3 className="font-semibold text-slate-900">{q}</h3>
                <p className="mt-2 text-sm text-slate-600">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to transform your documents?</h2>
          <p className="mt-4 text-lg text-indigo-100">Join thousands of teams using DOCUMIND-AI to unlock insights.</p>
          <Link to="/register" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3 font-bold text-indigo-600 hover:bg-slate-50 shadow-lg">
            Start free trial <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Pricing;
