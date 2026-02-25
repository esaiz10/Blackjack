import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebaseConfig";
import { Colors } from "../styles/theme";

export default function LoginScreen() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const cleanEmail = email.trim();

  const handleLogin = async () => {
    if (!cleanEmail || !password) {
      Alert.alert("Missing info", "Please enter your email and password.");
      return;
    }
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch (e) {
      Alert.alert("Login failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert("Missing info", "Please enter your name.");
      return;
    }
    if (!cleanEmail) {
      Alert.alert("Missing info", "Please enter your email.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }
    try {
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      await updateProfile(cred.user, { displayName: name.trim() });
    } catch (e) {
      Alert.alert("Registration failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const isLogin = mode === "login";

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.suit}>♠ ♥</Text>
          <Text style={styles.title}>Blackjack</Text>
          <Text style={styles.suit}>♦ ♣</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{isLogin ? "Sign In" : "Create Account"}</Text>

          {/* Name — register only */}
          {!isLogin && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            </View>
          )}

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={isLogin ? "Your password" : "6+ characters"}
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
            />
          </View>

          {/* Confirm Password — register only */}
          {!isLogin && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
              />
            </View>
          )}

          {/* Primary action */}
          <Pressable
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={isLogin ? handleLogin : handleRegister}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? "Please wait…" : isLogin ? "Log In" : "Create Account"}
            </Text>
          </Pressable>

          {/* Switch mode */}
          <Pressable style={styles.switchBtn} onPress={switchMode}>
            <Text style={styles.switchText}>
              {isLogin
                ? "New here?  Create an account"
                : "Already have an account?  Log in"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },

  header: {
    alignItems: "center",
    marginBottom: 32,
  },

  suit: {
    fontSize: 28,
    color: Colors.goldDim,
    letterSpacing: 12,
  },

  title: {
    fontSize: 42,
    fontWeight: "900",
    color: Colors.gold,
    letterSpacing: 4,
    textShadowColor: "rgba(255,215,0,0.25)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
    marginVertical: 6,
  },

  card: {
    width: "100%",
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.white,
    marginBottom: 22,
    textAlign: "center",
    letterSpacing: 1,
  },

  fieldGroup: {
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.goldDim,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },

  input: {
    backgroundColor: Colors.bgInput,
    color: Colors.white,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  primaryBtn: {
    backgroundColor: Colors.green,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.greenLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },

  btnDisabled: {
    opacity: 0.45,
  },

  primaryBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  switchBtn: {
    marginTop: 18,
    alignItems: "center",
    paddingVertical: 4,
  },

  switchText: {
    color: Colors.goldDim,
    fontSize: 14,
    textDecorationLine: "underline",
    textDecorationColor: Colors.goldDim,
  },
});
