"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stepper } from "@/components/ui/stepper";
import { toast } from "sonner";
import {
  ArrowRight,
  LockKeyhole,
  Loader2,
  Mail,
  UserRound,
  Flame,
  Eye,
  EyeOff,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Step 1: Account Creation
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  
  // Step 2: Personal Details
  const [age, setAge] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [weight, setWeight] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [step2Errors, setStep2Errors] = useState<{
    age?: string;
    dateOfBirth?: string;
    weight?: string;
    fitnessGoal?: string;
  }>({});
  
  // Step 3: Workout Preferences
  const [experienceLevel, setExperienceLevel] = useState("");
  const [targetAreas, setTargetAreas] = useState<string[]>([]);
  const [workoutDays, setWorkoutDays] = useState("");
  const [workoutDuration, setWorkoutDuration] = useState("");
  const [workoutType, setWorkoutType] = useState("");
  const [step3Errors, setStep3Errors] = useState<{
    experienceLevel?: string;
    targetAreas?: string;
    workoutDays?: string;
    workoutDuration?: string;
    workoutType?: string;
  }>({});

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateStep1()) {
      toast.error("Please fix the errors before continuing");
      return;
    }
    
    if (!agreeTerms) {
      toast.error("Please agree to the terms and conditions");
      return;
    }
    
    setIsLoading(true);
    try {
      await register(email, password, `${firstName} ${lastName}`);
      toast.success("Account created successfully!");
      setCurrentStep(2);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2Submit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const newErrors: {
      age?: string;
      dateOfBirth?: string;
      weight?: string;
      fitnessGoal?: string;
    } = {};
    
    const ageNum = parseInt(age);
    const weightNum = parseFloat(weight);
    
    if (!age || isNaN(ageNum) || ageNum < 13 || ageNum > 100) {
      newErrors.age = "Please enter a valid age (13-100)";
    }
    if (!dateOfBirth) {
      newErrors.dateOfBirth = "Please select your date of birth";
    }
    if (!weight || isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
      newErrors.weight = "Please enter a valid weight (30-300 kg)";
    }
    if (!fitnessGoal) {
      newErrors.fitnessGoal = "Please select your fitness goal";
    }
    
    setStep2Errors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fix the errors before continuing");
      return;
    }
    
    setCurrentStep(3);
  };

  const handleStep3Submit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const newErrors: {
      experienceLevel?: string;
      targetAreas?: string;
      workoutDays?: string;
      workoutDuration?: string;
      workoutType?: string;
    } = {};
    
    if (!experienceLevel) {
      newErrors.experienceLevel = "Please select your experience level";
    }
    if (targetAreas.length === 0) {
      newErrors.targetAreas = "Please select at least one target area";
    }
    if (!workoutDays) {
      newErrors.workoutDays = "Please select workout days";
    }
    if (!workoutDuration) {
      newErrors.workoutDuration = "Please select workout duration";
    }
    if (!workoutType) {
      newErrors.workoutType = "Please select workout type";
    }
    
    setStep3Errors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please complete all workout preferences");
      return;
    }
    
    // Show personalized dashboard
    setCurrentStep(4);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleTargetArea = (area: string) => {
    setTargetAreas(prev => 
      prev.includes(area) 
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  const steps = [
    { id: '1', title: 'Sign Up', description: 'Create your account' },
    { id: '2', title: 'Personal Details', description: 'Your fitness profile' },
    { id: '3', title: 'Workout Plan', description: 'Customize preferences' },
  ];

  const validateStep1 = () => {
    const newErrors: {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Invalid email format";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 6) newErrors.password = "Password must be at least 6 characters";
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = "Password must contain uppercase, lowercase, and number";
    }
    if (!confirmPassword) newErrors.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div className="h-screen w-screen overflow-hidden grid lg:grid-cols-2">

      {/* ═══════════════ LEFT — Image Panel ═══════════════ */}
      <aside className="hidden lg:flex flex-col relative overflow-hidden">
        <img
          src="/gymauth.png"
          alt="Gym"
          className="  w-full h-full object-cover"
          style={{ objectPosition: "10% 30%" }}
        />
        {/* Dark gradient overlay for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />

        <div className=" absolute z-10 flex-col h-full p-10 xl:p-14">
          <div className="mb-8">
            <img src="/forge.png" alt="Forge Gym Logo" className="w-40 h-10 object-contain" />
          </div>
          <div className="max-w-full flex flex-col h-full justify-center">
            <div>
              <h2 className="text-5xl font-bold mb-4 !leading-[3.5rem]">
                <span className="text-red-500">START</span> <span className="text-white">YOUR</span> 
                <br />
                <span className="text-white">JOURNEY</span> <span className="text-red-500">TODAY.</span>
              </h2>
              <p className="text-sm text-zinc-300 mb-6">
                Join thousands of members transforming their lives every day.
              </p>

              <div className="grid grid-cols-2 gap-6">
                {[
                  "Free Membership Sign-up",
                  "Personal Training Plans",
                  "Progress Tracking Tools",
                  "Community Challenges",
                ].map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-4 p-4 border border-red-500/70 rounded-xl bg-black/30 backdrop-blur-sm"
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] shrink-0" />

                    <p className="text-[17px] font-medium text-white">
                      {feature}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══════════════ RIGHT — Form Panel ═══════════════ */}
      <section className="flex flex-col items-center justify-center bg-black overflow-y-auto px-8 py-12 sm:px-12">
        <div className="w-full max-w-[600px] border border-red-500/30 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-8 shadow-2xl shadow-red-500/10">

          {/* Mobile logo */}
          {currentStep <= 3 && (
            <Link href="/" className="mb-6 inline-flex items-center gap-2.5 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500 shadow-md shadow-red-500/30">
                <Flame className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-white">Forge Gym</span>
            </Link>
          )}

          {/* Heading */}
          {currentStep <= 3 && (
            <header className="mb-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[.38em] text-red-500">
                {currentStep === 1 ? "" : currentStep === 2 ? "Personalize your experience" : "Customize your workout"}
              </p>
              <h2 className="text-[1.75rem] font-extrabold tracking-tight text-white leading-tight">
                {currentStep === 1 ? "Create your account" : currentStep === 2 ? "Your personal details" : "Customize your workout"}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                {currentStep === 1 
                  ? "Start your fitness journey with Forge Gym today." 
                  : currentStep === 2 
                  ? "Tell us about yourself to create your personalized plan." 
                  : "Set your preferences to generate your perfect workout plan."}
              </p>
            </header>
          )}

          {/* Stepper */}
          {currentStep <= 3 && (
            <div className="mb-6">
              <Stepper 
                steps={steps} 
                currentStep={currentStep}
                completedSteps={Array.from({length: currentStep - 1}, (_, i) => i + 1)}
              />
            </div>
          )}

          {/* Form */}
          {currentStep === 1 && (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-zinc-300 font-medium text-sm">
                    First name
                  </Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        if (errors.firstName) setErrors({...errors, firstName: undefined});
                      }}
                      required
                      disabled={isLoading}
                      className={`h-11 rounded-xl pl-10 text-white placeholder:text-zinc-500 focus-visible:ring-red-500 transition-colors ${
                        errors.firstName 
                          ? 'border-red-500 bg-red-500/10 focus-visible:border-red-500' 
                          : 'border-zinc-700 bg-zinc-900 focus-visible:border-red-400'
                      }`}
                    />
                  </div>
                  {errors.firstName && (
                    <p className="text-xs text-red-400 mt-1">{errors.firstName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-zinc-300 font-medium text-sm">
                    Last name
                  </Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        if (errors.lastName) setErrors({...errors, lastName: undefined});
                      }}
                      required
                      disabled={isLoading}
                      className={`h-11 rounded-xl pl-10 text-white placeholder:text-zinc-500 focus-visible:ring-red-500 transition-colors ${
                        errors.lastName 
                          ? 'border-red-500 bg-red-500/10 focus-visible:border-red-500' 
                          : 'border-zinc-700 bg-zinc-900 focus-visible:border-red-400'
                      }`}
                    />
                  </div>
                  {errors.lastName && (
                    <p className="text-xs text-red-400 mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-zinc-300 font-medium text-sm">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({...errors, email: undefined});
                    }}
                    required
                    disabled={isLoading}
                    className={`h-11 rounded-xl pl-10 text-white placeholder:text-zinc-500 focus-visible:ring-red-500 transition-colors ${
                      errors.email 
                        ? 'border-red-500 bg-red-500/10 focus-visible:border-red-500' 
                        : 'border-zinc-700 bg-zinc-900 focus-visible:border-red-400'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-400 mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-zinc-300 font-medium text-sm">
                    Password
                  </Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 chars"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors({...errors, password: undefined});
                      }}
                      required
                      minLength={6}
                      disabled={isLoading}
                      className={`h-11 rounded-xl pl-10 pr-10 text-white placeholder:text-zinc-500 focus-visible:ring-red-500 transition-colors ${
                        errors.password 
                          ? 'border-red-500 bg-red-500/10 focus-visible:border-red-500' 
                          : 'border-zinc-700 bg-zinc-900 focus-visible:border-red-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-400 mt-1">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-zinc-300 font-medium text-sm">
                    Confirm
                  </Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repeat"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) setErrors({...errors, confirmPassword: undefined});
                      }}
                      required
                      minLength={6}
                      disabled={isLoading}
                      className={`h-11 rounded-xl pl-10 pr-10 text-white placeholder:text-zinc-500 focus-visible:ring-red-500 transition-colors ${
                        errors.confirmPassword 
                          ? 'border-red-500 bg-red-500/10 focus-visible:border-red-500' 
                          : 'border-zinc-700 bg-zinc-900 focus-visible:border-red-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-400 mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Terms & Conditions */}
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-400 select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="h-4 w-4 rounded accent-red-600"
                  required
                />
                I agree to the{" "}
                <button
                  type="button"
                  className="text-red-500 hover:text-red-600 font-medium transition-colors"
                >
                  Terms of Service
                </button>
                {" "}and{" "}
                <button
                  type="button"
                  className="text-red-500 hover:text-red-600 font-medium transition-colors"
                >
                  Privacy Policy
                </button>
              </label>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full rounded-xl bg-[#EF1111] text-sm font-bold text-white shadow-lg hover:bg-[#C90808] active:bg-[#A90606] transition-all"
                style={{ boxShadow: '0 10px 40px rgba(239, 17, 17, 0.35)' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} noValidate className="space-y-4">
              {/* Age */}
              <div className="space-y-1.5">
                <Label htmlFor="age" className="text-zinc-300 font-medium text-sm">
                  Age
                </Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="25"
                  value={age}
                  onChange={(e) => {
                    setAge(e.target.value);
                    if (step2Errors.age) setStep2Errors({...step2Errors, age: undefined});
                  }}
                  required
                  min="13"
                  max="100"
                  className={`h-11 rounded-xl text-white placeholder:text-zinc-500 focus-visible:ring-red-500 transition-colors ${
                    step2Errors.age 
                      ? 'border-red-500 bg-red-500/10 focus-visible:border-red-500' 
                      : 'border-zinc-700 bg-zinc-900 focus-visible:border-red-400'
                  }`}
                />
                {step2Errors.age && (
                  <p className="text-xs text-red-400 mt-1">{step2Errors.age}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth" className="text-zinc-300 font-medium text-sm">
                  Date of Birth
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => {
                    setDateOfBirth(e.target.value);
                    if (step2Errors.dateOfBirth) setStep2Errors({...step2Errors, dateOfBirth: undefined});
                  }}
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className={`h-11 rounded-xl text-white placeholder:text-zinc-500 focus-visible:ring-red-500 transition-colors ${
                    step2Errors.dateOfBirth 
                      ? 'border-red-500 bg-red-500/10 focus-visible:border-red-500' 
                      : 'border-zinc-700 bg-zinc-900 focus-visible:border-red-400'
                  }`}
                />
                {step2Errors.dateOfBirth && (
                  <p className="text-xs text-red-400 mt-1">{step2Errors.dateOfBirth}</p>
                )}
              </div>

              {/* Weight */}
              <div className="space-y-1.5">
                <Label htmlFor="weight" className="text-zinc-300 font-medium text-sm">
                  Weight (kg)
                </Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="72.5"
                  value={weight}
                  onChange={(e) => {
                    setWeight(e.target.value);
                    if (step2Errors.weight) setStep2Errors({...step2Errors, weight: undefined});
                  }}
                  required
                  min="30"
                  max="300"
                  className={`h-11 rounded-xl text-white placeholder:text-zinc-500 focus-visible:ring-red-500 transition-colors ${
                    step2Errors.weight 
                      ? 'border-red-500 bg-red-500/10 focus-visible:border-red-500' 
                      : 'border-zinc-700 bg-zinc-900 focus-visible:border-red-400'
                  }`}
                />
                {step2Errors.weight && (
                  <p className="text-xs text-red-400 mt-1">{step2Errors.weight}</p>
                )}
              </div>

              {/* Fitness Goal */}
              <div className="space-y-1.5">
                <Label htmlFor="fitnessGoal" className="text-zinc-300 font-medium text-sm">
                  Fitness Goal
                </Label>
                <div className="relative">
                  <select
                    id="fitnessGoal"
                    value={fitnessGoal}
                    onChange={(e) => {
                      setFitnessGoal(e.target.value);
                      if (step2Errors.fitnessGoal) setStep2Errors({...step2Errors, fitnessGoal: undefined});
                    }}
                    required
                    className={`h-11 w-full rounded-xl text-white pl-3 pr-10 focus-visible:ring-red-500 transition-colors appearance-none cursor-pointer ${
                      step2Errors.fitnessGoal 
                        ? 'border-red-500 bg-red-500/10 focus-visible:border-red-500' 
                        : 'border-zinc-700 bg-zinc-900 focus-visible:border-red-400'
                    }`}
                  >
                    <option value="" disabled className="text-zinc-500">Select your goal</option>
                    <option value="weight-loss">Weight loss</option>
                    <option value="muscle-gain">Muscle gain</option>
                    <option value="general-fitness">General fitness</option>
                    <option value="strength">Strength</option>
                    <option value="endurance">Endurance</option>
                    <option value="flexibility">Flexibility</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {step2Errors.fitnessGoal && (
                  <p className="text-xs text-red-400 mt-1">{step2Errors.fitnessGoal}</p>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 rounded-xl bg-[#EF1111] text-sm font-bold text-white shadow-lg hover:bg-[#C90808] active:bg-[#A90606] transition-all"
                  style={{ boxShadow: '0 10px 40px rgba(239, 17, 17, 0.35)' }}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          )}

          {currentStep === 3 && (
            <form onSubmit={handleStep3Submit} noValidate className="space-y-4">
              {/* Experience Level */}
              <div className="space-y-1.5">
                <Label className="text-zinc-300 font-medium text-sm">
                  Experience Level
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {["Beginner", "Intermediate", "Advanced"].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => {
                        setExperienceLevel(level);
                        if (step3Errors.experienceLevel) setStep3Errors({...step3Errors, experienceLevel: undefined});
                      }}
                      className={`h-10 rounded-xl border text-sm font-medium transition-all ${
                        experienceLevel === level
                          ? 'border-red-500 bg-red-500/20 text-red-400'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                {step3Errors.experienceLevel && (
                  <p className="text-xs text-red-400 mt-1">{step3Errors.experienceLevel}</p>
                )}
              </div>

              {/* Target Areas */}
              <div className="space-y-1.5">
                <Label className="text-zinc-300 font-medium text-sm">
                  Target Areas
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {["Full body", "Upper body", "Lower body", "Core", "Cardio"].map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => {
                        toggleTargetArea(area);
                        if (step3Errors.targetAreas) setStep3Errors({...step3Errors, targetAreas: undefined});
                      }}
                      className={`h-10 rounded-xl border text-sm font-medium transition-all ${
                        targetAreas.includes(area)
                          ? 'border-red-500 bg-red-500/20 text-red-400'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
                {step3Errors.targetAreas && (
                  <p className="text-xs text-red-400 mt-1">{step3Errors.targetAreas}</p>
                )}
              </div>

              {/* Workout Days */}
              <div className="space-y-1.5">
                <Label htmlFor="workoutDays" className="text-zinc-300 font-medium text-sm">
                  Workout Days
                </Label>
                <div className="relative">
                  <select
                    id="workoutDays"
                    value={workoutDays}
                    onChange={(e) => {
                      setWorkoutDays(e.target.value);
                      if (step3Errors.workoutDays) setStep3Errors({...step3Errors, workoutDays: undefined});
                    }}
                    required
                    className={`h-11 w-full rounded-xl text-white pl-3 pr-10 focus-visible:ring-red-500 transition-colors appearance-none cursor-pointer ${
                      step3Errors.workoutDays 
                        ? 'border-red-500 bg-red-500/10 focus-visible:border-red-500' 
                        : 'border-zinc-700 bg-zinc-900 focus-visible:border-red-400'
                    }`}
                  >
                    <option value="" disabled className="text-zinc-500">Select days per week</option>
                    <option value="2">2 days/week</option>
                    <option value="3">3 days/week</option>
                    <option value="4">4 days/week</option>
                    <option value="5">5 days/week</option>
                    <option value="6">6 days/week</option>
                    <option value="7">7 days/week</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {step3Errors.workoutDays && (
                  <p className="text-xs text-red-400 mt-1">{step3Errors.workoutDays}</p>
                )}
              </div>

              {/* Workout Duration */}
              <div className="space-y-1.5">
                <Label htmlFor="workoutDuration" className="text-zinc-300 font-medium text-sm">
                  Workout Duration
                </Label>
                <div className="relative">
                  <select
                    id="workoutDuration"
                    value={workoutDuration}
                    onChange={(e) => {
                      setWorkoutDuration(e.target.value);
                      if (step3Errors.workoutDuration) setStep3Errors({...step3Errors, workoutDuration: undefined});
                    }}
                    required
                    className={`h-11 w-full rounded-xl text-white pl-3 pr-10 focus-visible:ring-red-500 transition-colors appearance-none cursor-pointer ${
                      step3Errors.workoutDuration 
                        ? 'border-red-500 bg-red-500/10 focus-visible:border-red-500' 
                        : 'border-zinc-700 bg-zinc-900 focus-visible:border-red-400'
                    }`}
                  >
                    <option value="" disabled className="text-zinc-500">Select duration</option>
                    <option value="15-20">15–20 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60+">60+ minutes</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {step3Errors.workoutDuration && (
                  <p className="text-xs text-red-400 mt-1">{step3Errors.workoutDuration}</p>
                )}
              </div>

              {/* Workout Type */}
              <div className="space-y-1.5">
                <Label htmlFor="workoutType" className="text-zinc-300 font-medium text-sm">
                  Preferred Workout Type
                </Label>
                <div className="relative">
                  <select
                    id="workoutType"
                    value={workoutType}
                    onChange={(e) => {
                      setWorkoutType(e.target.value);
                      if (step3Errors.workoutType) setStep3Errors({...step3Errors, workoutType: undefined});
                    }}
                    required
                    className={`h-11 w-full rounded-xl text-white pl-3 pr-10 focus-visible:ring-red-500 transition-colors appearance-none cursor-pointer ${
                      step3Errors.workoutType 
                        ? 'border-red-500 bg-red-500/10 focus-visible:border-red-500' 
                        : 'border-zinc-700 bg-zinc-900 focus-visible:border-red-400'
                    }`}
                  >
                    <option value="" disabled className="text-zinc-500">Select workout type</option>
                    <option value="strength">Strength</option>
                    <option value="cardio">Cardio</option>
                    <option value="hiit">HIIT</option>
                    <option value="yoga">Yoga</option>
                    <option value="mobility">Mobility</option>
                    <option value="mixed">Mixed</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {step3Errors.workoutType && (
                  <p className="text-xs text-red-400 mt-1">{step3Errors.workoutType}</p>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 rounded-xl bg-[#EF1111] text-sm font-bold text-white shadow-lg hover:bg-[#C90808] active:bg-[#A90606] transition-all"
                  style={{ boxShadow: '0 10px 40px rgba(239, 17, 17, 0.35)' }}
                >
                  Generate My Plan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          )}

          {/* Personalized Dashboard */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Welcome Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 mb-4 shadow-lg shadow-red-500/30">
                  <Flame className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-extrabold text-white mb-2">
                  Welcome, {firstName}! 🎉
                </h2>
                <p className="text-sm text-zinc-400">
                  Your personalized fitness plan is ready
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 mb-1">Primary Goal</p>
                  <p className="text-sm font-semibold text-white capitalize">
                    {fitnessGoal.replace('-', ' ')}
                  </p>
                </div>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 mb-1">Current Weight</p>
                  <p className="text-sm font-semibold text-white">
                    {weight} kg
                  </p>
                </div>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 mb-1">Weekly Target</p>
                  <p className="text-sm font-semibold text-white">
                    {workoutDays} days/week
                  </p>
                </div>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 mb-1">Experience</p>
                  <p className="text-sm font-semibold text-white capitalize">
                    {experienceLevel}
                  </p>
                </div>
              </div>

              {/* Workout Summary */}
              <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-xs text-red-400 font-semibold mb-3 uppercase tracking-wider">
                  Your Personalized Plan
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Workout Type</span>
                    <span className="text-sm font-medium text-white capitalize">{workoutType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Duration</span>
                    <span className="text-sm font-medium text-white">{workoutDuration} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Focus Areas</span>
                    <span className="text-sm font-medium text-white">{targetAreas.slice(0, 2).join(', ')}{targetAreas.length > 2 ? ` +${targetAreas.length - 2}` : ''}</span>
                  </div>
                </div>
              </div>

              {/* Today's Workout Preview */}
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                    Today's Recommended Workout
                  </p>
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full font-medium">
                    {workoutDuration} min
                  </span>
                </div>
                <p className="text-sm font-medium text-white mb-2">
                  {fitnessGoal === 'weight-loss' ? 'Fat Burning Cardio' : 
                   fitnessGoal === 'muscle-gain' ? 'Strength Training' :
                   fitnessGoal === 'strength' ? 'Power Lifting' :
                   fitnessGoal === 'endurance' ? 'Endurance Builder' :
                   'Full Body Workout'}
                </p>
                <p className="text-xs text-zinc-400">
                  Based on your {experienceLevel} level and {workoutType} preference
                </p>
              </div>

              {/* Start Button */}
              <Button
                onClick={() => router.push("/")}
                className="h-12 w-full rounded-xl bg-[#EF1111] text-sm font-bold text-white shadow-lg hover:bg-[#C90808] active:bg-[#A90606] transition-all"
                style={{ boxShadow: '0 10px 40px rgba(239, 17, 17, 0.35)' }}
              >
                Start Today's Workout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {/* Skip Option */}
              <button
                onClick={() => router.push("/")}
                className="w-full text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                Skip and go to dashboard
              </button>
            </div>
          )}

          {/* Footer */}
          {currentStep <= 3 && (
            <p className="mt-6 text-center text-sm text-zinc-400">
              Already a member?{" "}
              <Link
                href="/login"
                className="font-semibold text-red-500 hover:text-red-600 underline-offset-2 hover:underline transition-colors"
              >
                Sign in
              </Link>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
