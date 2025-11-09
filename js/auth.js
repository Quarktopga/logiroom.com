// Supabase init + auth helpers
const SUPABASE_URL = "https://xozspbrhtfrzrdiyduvw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvenNwYnJodGZyenJkaXlkdXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2ODI5ODYsImV4cCI6MjA3ODI1ODk4Nn0.vSj_09sMhM0t_pUR8Co-bMhtcMvchySivZuZ6HRecBU";

let supabaseClient;
(function init() {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();

async function getSession() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session;
}

async function requireAuth(redirectIfMissing = true) {
  const session = await getSession();
  if (!session && redirectIfMissing) {
    window.location.href = "/login.html";
    return null;
  }
  return session;
}

async function signOut() {
  await supabaseClient.auth.signOut();
  window.location.href = "/index.html";
}

async function signUp(email, password, firstName, lastName) {
  // Email syntax validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) throw new Error("Email invalide");

  // Create user
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error("Création de compte échouée");

  // Create profile mirror
  const { error: pErr } = await supabaseClient.from("profiles")
    .insert({ user_id: user.id, email, first_name: firstName, last_name: lastName });
  if (pErr) throw pErr;

  // Sign in automatically
  const { error: sErr } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (sErr) throw sErr;

  return user;
}

async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}
