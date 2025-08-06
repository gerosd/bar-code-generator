import SignInPage from "./SignInPage";

export default function Page() {
    if (!process.env.BOT_USERNAME) {
      throw new Error("BOT_USERNAME is not set");
    }

    return <SignInPage botUsername={process.env.BOT_USERNAME} />;
}
