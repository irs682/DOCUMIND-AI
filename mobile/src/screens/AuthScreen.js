import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Sparkles, Mail, Lock, User as UserIcon } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const AuthScreen = () => {
  const { login, register } = useAuth();
  const { tokens } = useTheme();
  const currentColors = tokens.colors.current;

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter email and password.');
      return;
    }

    try {
      setSubmitting(true);
      if (isLogin) {
        await login(email.trim(), password);
      } else {
        if (!name.trim()) {
          Alert.alert('Name Required', 'Please enter your full name.');
          return;
        }
        await register({ name: name.trim(), email: email.trim(), password });
      }
    } catch (err) {
      Alert.alert(
        'Authentication Failed',
        err.message || 'Could not sign in. Please verify your credentials or server connection.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.canvas }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          {/* Logo / Badge */}
          <View style={styles.logoWrap}>
            <View style={[styles.logoIcon, { backgroundColor: tokens.colors.primary[600] }]}>
              <Sparkles size={24} color="#ffffff" />
            </View>
            <Text style={[styles.logoTitle, { color: currentColors.textPrimary }]}>
              DOCUMIND<Text style={{ color: tokens.colors.primary[500] }}>-AI</Text>
            </Text>
            <Text style={[styles.logoSub, { color: currentColors.textSecondary }]}>
              Autonomous Research Companion
            </Text>
          </View>

          {/* Form */}
          <View style={[styles.formBox, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
            <Text style={[styles.modeTitle, { color: currentColors.textPrimary }]}>
              {isLogin ? 'Sign In to Your Workspace' : 'Create Researcher Account'}
            </Text>
            <Text style={[styles.modeSub, { color: currentColors.textSecondary }]}>
              {isLogin
                ? 'Access your web studies, documents, and manuscripts.'
                : 'One unified account for both web and mobile.'}
            </Text>

            {!isLogin && (
              <View style={styles.inputWrap}>
                <Text style={[styles.inputLabel, { color: currentColors.textSecondary }]}>Full Name</Text>
                <View style={[styles.inputContainer, { borderColor: currentColors.border, backgroundColor: currentColors.canvas }]}>
                  <UserIcon size={16} color={currentColors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: currentColors.textPrimary }]}
                    placeholder="e.g. Dr. Alex Morgan"
                    placeholderTextColor={currentColors.textSecondary}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputWrap}>
              <Text style={[styles.inputLabel, { color: currentColors.textSecondary }]}>Email Address</Text>
              <View style={[styles.inputContainer, { borderColor: currentColors.border, backgroundColor: currentColors.canvas }]}>
                <Mail size={16} color={currentColors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: currentColors.textPrimary }]}
                  placeholder="researcher@documind.ai"
                  placeholderTextColor={currentColors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Text style={[styles.inputLabel, { color: currentColors.textSecondary }]}>Password</Text>
              <View style={[styles.inputContainer, { borderColor: currentColors.border, backgroundColor: currentColors.canvas }]}>
                <Lock size={16} color={currentColors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: currentColors.textPrimary }]}
                  placeholder="••••••••"
                  placeholderTextColor={currentColors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: tokens.colors.primary[600] }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={[styles.toggleText, { color: currentColors.textSecondary }]}>
                {isLogin
                  ? "Don't have an account? "
                  : 'Already have a DOCUMIND account? '}
                <Text style={{ color: tokens.colors.primary[500], fontWeight: '700' }}>
                  {isLogin ? 'Register' : 'Sign In'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  logoSub: {
    fontSize: 12,
    marginTop: 2,
  },
  formBox: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
  },
  modeTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  modeSub: {
    fontSize: 12,
    marginBottom: 18,
    lineHeight: 16,
  },
  inputWrap: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
  },
  submitBtn: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  toggleBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 12,
  },
});

export default AuthScreen;
