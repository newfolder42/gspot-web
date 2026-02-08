"use client";

import { useState } from "react";

const changelog = [
    {
        version: "v0.5.16",
        date: "2026-02-08",
        items: [
            "ლეიზი ლოადინგი პოსტებზე",
        ],
    },
    {
        version: "v0.5.2",
        date: "2026-01-29",
        items: [
            "ლიდერბორდი და ახალი მომხმარებლის გვერდები",
        ],
    },
    {
        version: "v0.5.1",
        date: "2026-01-25",
        items: [
            "ატვირთვის ახალი დიზაინი",
        ],
    },
    {
        version: "v0.5.0",
        date: "2026-01-19",
        items: [
            "დაემატა ახალი ნოთიფიკაცია: გამომწერის follow",
            "წაუკითხვი ნოთიფიკაციები 12 საათის შემდგომ იგზავნება მეილზე",
        ],
    },
    {
        version: "v0.4.1",
        date: "2026-01-14",
        items: [
            "მობილურში GPS ექსტრაქტის გაუმჯობესებამ არ იმუშავა (ბრაუზერი მაინც შლის ფოტოს GPS თაგებს)",
            "მობილურისთვის დაემატა დამატებით შეტყობინებები",
        ],
    },
    {
        version: "v0.4.0",
        date: "2026-01-14",
        items: [
            "მობილურში GPS ექსტრაქტის გაუმჯობესება (პროცესი ხორციელდება სერვერზე ასინქრონულად მობაილის ნაცვლად)",
        ],
    },
    {
        version: "v0.3.2",
        date: "2026-01-04",
        items: [
            "გამომწერის პოსტის შექმნის ნოთიფიკაცია",
        ],
    },
    {
        version: "v0.3.1",
        date: "2025-12-31",
        items: [
            "ინტერფეისის გაუმჯობესებები და ბაგფიქსები",
        ],
    },
    {
        version: "v0.3.0",
        date: "2025-12-27",
        items: [
            "დაემატა ნოთიფიკაციები, მხოლოდ სხვა მომხმარებლის მიერ გამოცნობის დროს",
        ],
    },
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

export default function ChangelogList() {
    const [visibleCount, setVisibleCount] = useState(5);
    const visible = changelog.slice(0, visibleCount);

    return (
        <ul className="px-6 py-4 space-y-2">
            {visible.map((rel) => (
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
                </div>
            ))}

            {changelog.length > visibleCount && (
                <div className="px-6 py-2">
                    <button
                        onClick={() => setVisibleCount(changelog.length)}
                        className="text-sm text-blue-600 hover:underline"
                    >
                        მეტის ნახვა
                    </button>
                </div>
            )}
        </ul>
    );
}
