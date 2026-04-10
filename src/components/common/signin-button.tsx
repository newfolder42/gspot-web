import Link from "next/link";

const SignInButton = () => (
    <Link href="/auth/signin" className="px-4 py-2 rounded-md border border-teal-500 text-teal-500 bg-transparent hover:bg-teal-500 hover:text-black transition-colors">
        ავტორიზაცია
    </Link>
);

export default SignInButton;