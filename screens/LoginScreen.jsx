import React, { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig.js";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const cleanEmail = email.trim();

  const signUp = async () => {
    if (!cleanEmail || !password) {
      alert("Please type email + password.");
      return;
    }

    try {
      setLoading(true);
      await createUserWithEmailAndPassword(auth, cleanEmail, password);
    } catch (e) {
      alert("Sign up failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const logIn = async () => {
    if (!cleanEmail || !password) {
      alert("Please type email + password.");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch (e) {
      alert("Login failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Login</h1>

      <label style={{ color: "white", marginBottom: 6 }}>Email</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder="you@example.com"
        style={styles.input}
      />

      <label style={{ color: "white", marginBottom: 6 }}>Password</label>
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        placeholder="password (6+ chars)"
        style={styles.input}
      />

      <button style={styles.button} onClick={logIn} disabled={loading}>
        {loading ? "Loading..." : "Log In"}
      </button>

      <button style={styles.button} onClick={signUp} disabled={loading}>
        {loading ? "Loading..." : "Create Account"}
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#0b6623",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
  },
  input: {
    width: "90%",
    maxWidth: 360,
    backgroundColor: "#1a1a1a",
    color: "white",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    border: "none",
    fontSize: 16,
    outline: "none",
  },
  button: {
    backgroundColor: "#222",
    color: "white",
    padding: "12px 24px",
    borderRadius: 8,
    marginTop: 10,
    fontSize: 16,
    fontWeight: "bold",
    border: "none",
    cursor: "pointer",
  },
};
