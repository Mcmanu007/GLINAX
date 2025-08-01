"use client";

import React, { useState } from "react";

const PaymentPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePayment = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/pay/", {
        method: "POST",
        credentials: "include",
      });
      if (response.redirected) {
        window.location.href = response.url;
      } else {
        const data = await response.json();
        setError(data.message || "Payment initiation failed");
      }
    } catch (err) {
      setError("Payment initiation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Upgrade to Premium</h1>
      <p>Pay 25.00 GHS to upgrade your account to premium.</p>
      <button onClick={handlePayment} disabled={loading}>
        {loading ? "Processing..." : "Pay with Paystack"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default PaymentPage;
