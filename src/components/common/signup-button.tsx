import Link from "next/link";

const SignUpButton = () => (
    <Link href="/auth/signup" className="px-4 py-2 rounded-md bg-teal-500 hover:bg-teal-600 text-black transition-colors">
        რეგისტრაცია
    </Link>
);

export default SignUpButton;