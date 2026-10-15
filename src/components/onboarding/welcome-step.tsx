import type { ComponentType } from "react";
import { FlagIcon, ImageIcon, MapPinIcon, TrophyIcon } from "@/components/icons";

type Feature = {
  Icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
};

/**
 * What the site does, one entry per capability. Kept as data so a feature can later be
 * lifted out into a step of its own without touching the others.
 */
const FEATURES: Feature[] = [
  {
    Icon: ImageIcon,
    title: "ატვირთე სურათი",
    text: "გამოაქვეყნე საქართველოში გადაღებული ფოტო.",
  },
  {
    Icon: MapPinIcon,
    title: "გამოიცანი მდებარეობა",
    text: "მონიშნე რუკაზე სავარაუდო ადგილი. რაც უფრო ახლოს ხარ, მით მეტ ქულას იღებ.",
  },
  {
    Icon: FlagIcon,
    title: "შეასრულე მისიები",
    text: "მისიები კონკრეტული ადგილების მოსანახულებლად და ფოტოების გადასაღებად.",
  },
  {
    Icon: TrophyIcon,
    title: "გახსენი მიღწევები",
    text: "აქტივობისთვის დააგროვე ქულები, გახსენი მიღწევები, მიიღე ჯილდოები და აიწიე ლიდერბორდში.",
  },
];

export default function WelcomeStep() {
  return (
    <div>
      <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
        კეთილი იყოს შენი მობრძანება
      </h1>
      <p className="mt-3 leading-relaxed text-zinc-600 dark:text-zinc-300">
        შემოუერთდი ქართულ ლოკაციის გამომცნობ თამაშს
      </p>

      <ul className="mt-6 grid gap-4">
        {FEATURES.map(({ Icon, title, text }) => (
          <li key={title} className="flex gap-3">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-teal-500" />
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
