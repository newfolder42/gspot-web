import Link from "next/link";

const SignUpButton = () => (
    <Link href="/auth/signup" className="px-4 py-2 rounded-md bg-[#00c8ff] hover:bg-[#00b0e6] text-black transition-colors">
        რეგისტრაცია
    </Link>
);

export default SignUpButton;