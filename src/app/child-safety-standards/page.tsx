import { APP_NAME, PUBLIC_SITE_URL } from "@/types/constants";

export const metadata = {
  title: `Child Safety Standards | ${APP_NAME}`,
  description: `${APP_NAME}'s published standards against child sexual abuse and exploitation (CSAE).`,
  alternates: {
    canonical: `https://${PUBLIC_SITE_URL}/child-safety-standards`,
  },
};

const LAST_UPDATED = "September 4, 2026";
const SAFETY_CONTACT_EMAIL = "privacy@gspot.ge";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800">
      <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
      </div>
      <div className="px-6 py-4 space-y-2">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-600 dark:text-zinc-400">{children}</p>;
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
      <div>
        <p className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">{label}</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">{children}</p>
      </div>
    </li>
  );
}

export default function ChildSafetyStandardsPage() {
  return (
    <div className="max-w-5xl mx-auto my-auto px-2 py-2 md:py-4 space-y-6">
      <section className="bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Child Safety Standards
          </h1>
        </div>
        <div className="px-6 py-4 space-y-2">
          <P>
            {APP_NAME} maintains a zero-tolerance policy toward child sexual abuse and
            exploitation (CSAE) in any form. This page describes what we prohibit, how
            to report a concern, and how reports are handled.
          </P>
          <P>Last updated: {LAST_UPDATED}</P>
        </div>
      </section>

      <Section title="Zero-Tolerance Policy">
        <P>
          {APP_NAME} does not permit content, communication, or conduct that sexualizes,
          endangers, or exploits minors. This applies across every part of the service:
          posts, photos, comments, profiles, and any other user-generated content or
          interaction.
        </P>
      </Section>

      <Section title="Prohibited Content and Conduct">
        <ul className="space-y-2">
          <Item label="Sexual content involving minors">
            Any image, video, description, or depiction that sexualizes a person under
            18, whether real or simulated.
          </Item>
          <Item label="Grooming or solicitation">
            Attempting to build a relationship with a minor for the purpose of sexual
            abuse, exploitation, or extraction of explicit content.
          </Item>
          <Item label="Endangerment">
            Content or behavior that puts a minor's physical safety or wellbeing at
            risk, including sharing a minor's location or personal details without
            appropriate consent.
          </Item>
          <Item label="Facilitation">
            Sharing links, contact details, or instructions intended to direct users to
            CSAE content elsewhere.
          </Item>
        </ul>
      </Section>

      <Section title="How to Report a Concern">
        <P>
          Every post and every user profile in the {APP_NAME} app includes a Report
          option. Selecting Report and choosing the &quot;child safety&quot; reason
          sends the report directly to our safety contact, including which post or
          account was reported and any details provided.
        </P>
        <P>
          You can also report a concern directly by emailing{" "}
          <a
            href={`mailto:${SAFETY_CONTACT_EMAIL}`}
            className="text-zinc-800 dark:text-zinc-100 hover:underline"
          >
            {SAFETY_CONTACT_EMAIL}
          </a>
          . Please include as much detail as you can: the account or content involved,
          and what you observed.
        </P>
      </Section>

      <Section title="Our Response Process">
        <ul className="space-y-2">
          <Item label="Review">
            Reports are reviewed by our safety contact as soon as they are received.
          </Item>
          <Item label="Removal and enforcement">
            Content confirmed to violate this policy is removed, and the associated
            account is suspended or permanently banned.
          </Item>
          <Item label="Reporting to authorities">
            Where required by law, confirmed CSAE material and related account
            information are reported to the relevant national law enforcement or child
            protection authority.
          </Item>
        </ul>
      </Section>

      <Section title="Point of Contact">
        <P>
          Our designated point of contact for questions about {APP_NAME}&apos;s CSAE
          prevention practices and compliance is reachable at{" "}
          <a
            href={`mailto:${SAFETY_CONTACT_EMAIL}`}
            className="text-zinc-800 dark:text-zinc-100 hover:underline"
          >
            {SAFETY_CONTACT_EMAIL}
          </a>
          .
        </P>
      </Section>
    </div>
  );
}
