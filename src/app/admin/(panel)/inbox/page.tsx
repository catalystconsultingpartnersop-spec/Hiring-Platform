import Messages from "../messages/page";
import Requests from "../requests/page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inbox" };

// One place for everything people sent us: questions from owners about candidates,
// and "Contact us" requests. Each still has its own page; this shows both.
export default async function Inbox(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <div style={{ display: "grid", gap: 28, paddingBottom: 40 }}>
      <section>
        <Messages {...(props as unknown as PageProps<"/admin/messages">)} />
      </section>
      <section style={{ borderTop: "1px solid var(--line)", paddingTop: 8 }}>
        <Requests {...(props as unknown as PageProps<"/admin/requests">)} />
      </section>
    </div>
  );
}
