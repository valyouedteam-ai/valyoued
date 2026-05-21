import { Link } from "wouter";
import { MarketingTopNav } from "@/components/layout/MarketingTopNav";

export default function PrivacyPage() {
  return (
    <div className="min-h-[100dvh] bg-[hsl(222,47%,6%)] text-white">
      <MarketingTopNav variant="dark" />

      <article className="max-w-3xl mx-auto px-6 py-12 space-y-8 text-white/85 leading-relaxed">
        <div>
          <h1 className="text-3xl font-brand font-semibold text-white mb-2">Privacy & data</h1>
          <p className="text-sm text-white/50">
            Plain-language summary for MVP users (EU / UK GDPR-aware). Replace with counsel-reviewed
            legal copy before public launch.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Who controls your account</h2>
          <p>
            Sign-in is handled by our authentication partner (including optional social providers such
            as Google). ValYoued receives a stable user identifier (not your password) so we can
            scope valuations, listings, and billing to you.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">What we process</h2>
          <ul className="list-disc pl-5 space-y-2 text-white/80">
            <li>
              Valuation inputs you submit (titles, structured attributes, optional purchase price,
              photos you upload for automated field extraction).
            </li>
            <li>
              Derived outputs: estimates, arbitrage tables, generated narrative text, listing drafts, and
              coarse analytics events (for example “estimate created” with asset class and numeric
              mid-price, not payment card data).
            </li>
            <li>
              Billing identifiers from our payment processor when you subscribe (customer reference, subscription status).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Lawful bases (GDPR)</h2>
          <p>
            We rely on <strong className="text-white">contractual necessity</strong> to deliver the
            service you request, <strong className="text-white">legitimate interests</strong> to secure
            and improve valuation quality (including future proprietary models, always proportionate
            and with technical safeguards), and{" "}
            <strong className="text-white">consent</strong> where required for optional analytics or
            marketing communications (configure separately in production).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Your rights</h2>
          <p>
            Request access or portability when signed in via{" "}
            <Link href="/sign-in?redirect_url=/settings" className="text-cyan-300 hover:underline">
              Settings → Download data export
            </Link>
            . Correct inaccurate profile data in your account settings. Object to certain processing
            or request erasure where applicable. Note that some records may be retained where law
            requires.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Retention & model development</h2>
          <p>
            Structured valuation metadata may be retained to train and benchmark proprietary valuation
            logic. Identifiers can be minimised or aggregated for research datasets; production rollout
            should layer a formal consent flag on sensitive pipelines.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Contact</h2>
          <p className="text-white/60">
            Insert Data Protection Officer / privacy inbox before launch:
            <span className="text-cyan-200/80 font-medium"> privacy@valyoued.example</span>
          </p>
        </section>
      </article>
    </div>
  );
}
