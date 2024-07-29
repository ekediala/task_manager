import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import "./App.css";
import { Dashboard } from "./dashboard";
import { supabase } from "./services";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return (
      <div className="flex flex-col w-svw justify-center items-center">
        <Auth
          supabaseClient={supabase}
          providers={["google"]}
          providerScopes={{
            google: "https://www.googleapis.com/auth/calendar",
          }}
          redirectTo={import.meta.env.VITE_REDIRECT_URL}
          appearance={{
            theme: ThemeSupa,
            style: {
              container: {
                width: "400px",
              },
            },
          }}
        />
      </div>
    );
  }
  return <Dashboard session={session} />;
}
