"use client";

import { useState } from "react";
import { HeroSection } from "./components/hero-section";
import { PlansSection } from "./components/plans-section";
import { SupportSection } from "./components/support-section";
import { Footer } from "./components/footer";
import { PaymentModal } from "./components/payment-modal";
import { SuccessModal } from "./components/success-modal";
import { NoVoucherModal } from "./components/no-voucher-modal";
import { AdminLoginModal } from "./components/admin-login-modal";

export default function PublicPage() {
  const [selectedPlan, setSelectedPlan] = useState<Record<string, unknown> | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showNoVoucher, setShowNoVoucher] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [paymentResult, setPaymentResult] = useState<Record<string, unknown> | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  const handlePaymentSuccess = (result: Record<string, unknown>) => {
    setShowPayment(false);
    setPaymentResult(result);
    setShowSuccess(true);
  };

  const handlePaymentError = () => {
    setShowPayment(false);
    setShowNoVoucher(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <HeroSection onAdminClick={() => setShowAdminLogin(true)} />
      <main
        style={{
          maxWidth: "1200px",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "16px",
          paddingRight: "16px",
        }}
      >
        <PlansSection onSelectPlan={handleSelectPlan} />
        <SupportSection />
      </main>
      <Footer />
      {showPayment && selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      )}
      {showSuccess && paymentResult && (
        <SuccessModal data={paymentResult} onClose={() => setShowSuccess(false)} />
      )}
      {showNoVoucher && (
        <NoVoucherModal onClose={() => setShowNoVoucher(false)} />
      )}
      {showAdminLogin && (
        <AdminLoginModal onClose={() => setShowAdminLogin(false)} />
      )}
    </div>
  );
}
