import Link from "next/link";

const SignInButton = () => (
    <Link href="/auth/signin" className="px-4 py-2 rounded-md border border-[#00c8ff] text-[#00c8ff] bg-transparent hover:bg-[#00c8ff] hover:text-black transition-colors">
        ავტორიზაცია
    </Link>
);

export default SignInButton;