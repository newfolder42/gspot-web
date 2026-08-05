import { APP_NAME } from "@/types/constants";

export const metadata = {
  title: `კონფიდენციალურობის პოლიტიკა | ${APP_NAME}`,
  description: `${APP_NAME}-ის კონფიდენციალურობის პოლიტიკა - რა მონაცემებს ვაგროვებთ და როგორ ვიყენებთ.`,
};

const LAST_UPDATED = "2026 წლის 4 აგვისტო";
const CONTACT_EMAIL = "privacy@gspot.ge";

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

export default function PrivacyPage() {
  return (
    <div className="max-w-5xl mx-auto my-auto px-2 py-2 md:py-4 space-y-6">
      <section className="bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            კონფიდენციალურობის პოლიტიკა
          </h1>
        </div>
        <div className="px-6 py-4 space-y-2">
          <P>
            ეს პოლიტიკა აღწერს, თუ რა მონაცემებს აგროვებს {APP_NAME} (ვებგვერდი და
            Android აპლიკაცია), რა მიზნით იყენებს მათ და როგორ შეგიძლია მათი წაშლა.
          </P>
          <P>ბოლო განახლება: {LAST_UPDATED}</P>
        </div>
      </section>

      <Section title="რა მონაცემებს ვაგროვებთ">
        <ul className="space-y-2">
          <Item label="ანგარიშის მონაცემები">
            ელფოსტა, სახელი და ფსევდონიმი (alias) - რეგისტრაციისა და ავტორიზაციისთვის.
            პაროლი ინახება მხოლოდ დაშიფრული (hash) სახით.
          </Item>
          <Item label="ფოტოსურათები და გეო-ლოკაცია">
            შენს მიერ ატვირთული ფოტოები და მათი გეოგრაფიული კოორდინატები. ეს არის
            აპლიკაციის ძირითადი ფუნქცია - კოორდინატები საჭიროა იმისთვის, რომ სხვებმა
            გამოიცნონ სურათის გადაღების ადგილი.
          </Item>
          <Item label="მოწყობილობის ლოკაცია">
            აპლიკაცია ითხოვს ლოკაციაზე წვდომას მისიების (quest) ამოცანების ადგილზე
            დასადასტურებლად და ფოტოს გადაღების ადგილის მისათითებლად. ლოკაციას ვიღებთ
            მხოლოდ მაშინ, როცა აპლიკაცია ღიაა - ფონურ რეჟიმში თვალყურს არ ვადევნებთ.
          </Item>
          <Item label="შეტყობინებების ტოკენი">
            Push-შეტყობინებების გასაგზავნად ვინახავთ მოწყობილობის ტოკენს
            (Expo push token). ის დაკავშირებულია შენს ანგარიშთან და იშლება
            ანგარიშიდან გამოსვლისას.
          </Item>
          <Item label="აქტივობის მონაცემები">
            პოსტები, კომენტარები, გამოცნობები, ხმები, ჯილდოები, მიღწევები და
            მსგავსი მოქმედებები, რომლებიც აპლიკაციის ფუნქციონირებისთვისაა საჭირო.
          </Item>
        </ul>
      </Section>

      <Section title="რატომ ვიყენებთ ამ მონაცემებს">
        <ul className="space-y-2">
          <Item label="სერვისის მუშაობა">
            ანგარიშის შექმნა, ავტორიზაცია, პოსტების და გამოცნობების ჩვენება, ქულების
            და მიღწევების დათვლა.
          </Item>
          <Item label="შეტყობინებები">
            რომ შეიტყო ახალი კომენტარის, გამოცნობის, ჯილდოს ან მისიის შესახებ.
          </Item>
          <Item label="უსაფრთხოება">
            ბოროტად გამოყენების აღკვეთა და ტექნიკური შეცდომების დიაგნოსტიკა.
          </Item>
        </ul>
        <P>
          ჩვენ არ ვყიდით შენს პერსონალურ მონაცემებს და არ ვიყენებთ მათ სარეკლამო
          მიზნებისთვის.
        </P>
      </Section>

      <Section title="მესამე მხარეები">
        <P>
          მონაცემების შენახვისა და სერვისის მუშაობისთვის ვიყენებთ შემდეგ სერვისებს:
        </P>
        <ul className="space-y-2">
          <Item label="Amazon Web Services (AWS)">
            ჰოსტინგი, მონაცემთა ბაზა და ფოტოების შენახვა (S3).
          </Item>
          <Item label="Amazon SES">ელფოსტის გაგზავნა (დადასტურება, პაროლის აღდგენა).</Item>
          <Item label="Expo / Google Firebase Cloud Messaging">
            Push-შეტყობინებების მიწოდება Android მოწყობილობებზე.
          </Item>
          <Item label="Mapbox">რუკების ჩვენება.</Item>
        </ul>
      </Section>

      <Section title="მონაცემების შენახვა და წაშლა">
        <P>
          მონაცემები ინახება მანამ, სანამ შენი ანგარიში აქტიურია. ანგარიშის წაშლის
          სურვილის შემთხვევაში დაგვიკავშირდი - ანგარიში და მასთან დაკავშირებული
          პოსტები, კომენტარები და ფოტოები წაიშლება.
        </P>
        <P>
          Push-შეტყობინებები შეგიძლია გამორთო მოწყობილობის პარამეტრებიდან
          ნებისმიერ დროს.
        </P>
      </Section>

      <Section title="ბავშვები">
        <P>
          სერვისი არ არის განკუთვნილი 13 წლამდე ასაკის მომხმარებლებისთვის და
          შეგნებულად არ ვაგროვებთ მათ მონაცემებს.
        </P>
      </Section>

      <Section title="კონტაქტი">
        <P>
          კითხვების ან მონაცემების წაშლის მოთხოვნის შემთხვევაში მოგვწერე:{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-zinc-800 dark:text-zinc-100 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </P>
        <P>
          ტექნიკური საკითხებისთვის იხილე{" "}
          <a
            href="https://github.com/newfolder42/gspot-web/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-800 dark:text-zinc-100 hover:underline"
          >
            GitHub Issues
          </a>
          .
        </P>
      </Section>
    </div>
  );
}
