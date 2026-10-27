import { ApplyForm } from "./ApplyForm";

export default function ApplyPage() {
  return (
    <div className="wrap narrow">
      <div className="page-head">
        <h1>Find work that fits how you&rsquo;re wired.</h1>
        <p>
          It&rsquo;s free. We meet with you, run an assessment, and help you figure out which roles bring out your
          best. Then we write an anonymous profile, you approve it, and business owners browse it. Your name is
          only shared with an owner who signs an agreement with us.
        </p>
      </div>
      <ApplyForm />
    </div>
  );
}
