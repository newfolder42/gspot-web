import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-static";

export default function AboutPage() {
  const features = [
    { title: "მომხმარებლის ანგარიში", desc: "რეგისტრაცია/ავტორიზავია, სესიები, პროფილის ნახვა" },
    { title: "კავშირები", desc: "სხვა მომხმარებლებთან დაკავშირება" },
    { title: "ფოტო-სურათის ატვირთვა", desc: "GPS ლოკაციის თარის მქონე სურათების ატვირთვა" },
    { title: "ატვირთული პოსტების ნახვა", desc: "საიტის ჭრილშ ყველა პოსტის გამოჩენა" },
    { title: "ძებნა", desc: "პოსტისა და მომხმარებლების ძიება" },
  ];

  const roadmap = [
    { title: "Google ავტორიზაცია", status: "მიმდინარე", note: "OAuth ავტორიზაცია" },
    { title: "ლიდერბორდი", status: "დაგეგმილი", note: "ქულების მიხედვით მომხმარებლების სორტირება" },
    { title: "პოსტის დეტალები და კომენტარები", status: "დაგეგმილი", note: "ამჟამად პოსტი მხოლოდ იქმნება და გააჩნია ავტორი, კონტენტი, საჭიროა დაემატოს კომენტარები, გამოცნობის ისტორია" },
  ];

  const changelog = [
    {
      version: "v0.2.0",
      date: "2025-12-01",
      items: [
        "სერჩი მომხმაბლისა და პოსტების",
        "პროგრეს ბარი პოსტის ატვირთვისას",
        "'ჩვენს შესახებ' გვერდის დამატება",
      ],
    },
    {
      version: "v0.1.0",
      date: "2025-11-25",
      items: [
        "ინიციალიზაცია: ანგარიში, პოსტი, კავშირები",
      ],
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <section className="bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{APP_NAME}-ის შესახებ</h1>
        </div>
        <div className="px-6 py-4">
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {APP_NAME} არის ქართული გასართობი პორტალი ფოტო-სურათების გეო ლოკაციის გამოსაცნობად. საიტზე რეგისტრაციის შემდგომ შეგიძლია ატვირთო ფოტო-სურათი რომელსაც აქვს გეო ლოკაციის თაგი, და სხვას მისცე საშუალება გამოიცნოს სადაა გადაღებული.
          </p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            საიტის დეველოპმენტი ხორციელდება სწავლისა და გამოცდილების გაზრდის მიზნით, მისი კომერციალიზაცია არ იგეგმება.
            საიტის ფუნქციონირებისთვის გამოყენებულია შემდეგი ტექნოლოგიები:
          </p>
        </div>
        <div className="px-6 py-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800">Next.js</span>
          <span className="inline-flex items-center rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800">PostgreSQL</span>
          <span className="inline-flex items-center rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800">AWS Hosting</span>
          <span className="inline-flex items-center rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800">AWS S3</span>
        </div>
      </section>

      <section className="bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800">
        <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">შესაძლებლობები</h2>
        </div>
        <ul className="px-6 py-4 mt-3 space-y-2">
          {features.map((f) => (
            <li key={f.title} className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-green-500" />
              <div>
                <p className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">{f.title}</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{f.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800">
        <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">გეგმები</h2>
        </div>
        <ul className="px-6 py-4 space-y-2">
          {roadmap.map((r) => (
            <li key={r.title} className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
              <div>
                <p className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">{r.title} <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">{r.status}</span></p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{r.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800">
        <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">ცვლილებები</h2>
        </div>
        <ul className="px-6 py-4 space-y-2">
          {changelog.map((rel) => (
            <div key={rel.version} className="border border-zinc-200 dark:border-zinc-800 rounded-md">
              <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-800">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{rel.version}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{rel.date}</span>
              </div>
              <ul className="px-4 py-3 list-disc list-inside text-sm text-zinc-700 dark:text-zinc-200">
                {rel.items.map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            </div>))}
        </ul>
      </section>
    </div>
  );
}
