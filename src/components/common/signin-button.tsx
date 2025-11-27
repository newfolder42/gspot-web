import Link from "next/link";

const SignInButton = () => (
  <Link href="/auth/signin" className="px-6 py-2 rounded-full border border-[#00c8ff] text-[#00c8ff] font-semibold bg-transparent hover:bg-[#00c8ff] hover:text-white transition-colors">
    ავტორიზაცია
  </Link>
);

export default SignInButton;