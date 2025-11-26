import Link from "next/link";

const SignUpButton = () => (
    <Link href="/auth/signup" className="px-6 py-2 rounded-full bg-gradient-to-r from-[#5ae1ff] via-[#00c8ff] to-[#7de1ff] text-black font-semibold shadow hover:from-[#00c8ff] hover:to-[#5ae1ff] transition-colors">
        რეგისტრაცია
    </Link>
);

export default SignUpButton;