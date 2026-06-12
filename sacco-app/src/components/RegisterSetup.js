import React, { useState } from "react";
import { addTransaction, saveContributionSettings } from "../utils/financeStore";

const steps = [
  "Sacco Setup",
  "Add Members",
  "Contribution Setup",
  "Loan Types",
  "Bank Account Setup",
  "Confirmation",
];

function RegisterSetup({ setActivePage }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState({
    saccoName: "",
    members: "",
    membersList: "",
    type: "",
    role: "",
    country: "Kenya",
    currency: "Kenya Shilling (KES)",
    registeredEntity: "no",
    contributionAmount: "",
    contributionFrequency: "Monthly",
    contributionDescription: "",
    loanTypeName: "",
    loanInterest: "",
    loanMaxAmount: "",
    loanNotes: "",
    bankName: "",
    accountNumber: "",
    bankBranch: "",
  });

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const goNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  };

  const goBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const rememberSacco = (sacco) => {
    let saccos = [];
    try {
      saccos = JSON.parse(window.localStorage.getItem("digiSaccos") || "[]");
    } catch (error) {
      saccos = [];
    }

    const nextSacco = {
      id: sacco.id,
      name: sacco.name,
      contributionAmount: sacco.contributionAmount || form.contributionAmount,
      contributionFrequency: sacco.contributionFrequency || form.contributionFrequency,
      contributionDescription:
        sacco.contributionDescription || form.contributionDescription || "Member contribution",
    };
    const nextSaccos = saccos.some((record) => Number(record.id) === Number(nextSacco.id))
      ? saccos.map((record) => (Number(record.id) === Number(nextSacco.id) ? nextSacco : record))
      : [nextSacco, ...saccos];

    window.localStorage.setItem("digiSaccos", JSON.stringify(nextSaccos));
  };

   const handleComplete = async () => {
     let saccoId = null;
     
    
     try {
       const saccoResponse = await fetch("http://localhost:5000/api/sacco", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           name: form.saccoName,
           description: `Sacco created via Digi Sacco setup`,
           registrationNumber: "",
           country: form.country,
           currency: form.currency.split(" ")[0],
           contributionAmount: form.contributionAmount,
           contributionFrequency: form.contributionFrequency,
           contributionDescription: form.contributionDescription || "Member contribution"
         }),
       });
       
       const saccoData = await saccoResponse.json();
       if (saccoResponse.ok && saccoData.id) {
         saccoId = saccoData.id;
         rememberSacco(saccoData);
         console.log("Sacco created with ID:", saccoId);
       } else {
         throw new Error(saccoData.error || "Failed to create sacco");
       }
     } catch (error) {
       console.error("Error creating sacco:", error);
       alert("Failed to create sacco: " + error.message);
       return;
     }

     // If the user just registered, post a first contribution transaction to backend
     const registeredEmail = window.localStorage.getItem("lastRegisteredEmail");
     if (registeredEmail) {
       const users = JSON.parse(window.localStorage.getItem("digiUsers") || "[]");
       const setupByEmail = JSON.parse(window.localStorage.getItem("digiSetupByEmail") || "{}");
       const registeredUser = users.find((user) => user.email === registeredEmail);
       const role = form.role || registeredUser?.role || "member";

       window.localStorage.setItem(
         "digiUsers",
         JSON.stringify(
           users.map((user) =>
             user.email === registeredEmail
               ? { ...user, role, saccoName: form.saccoName || "Digi Sacco", saccoId: saccoId }
               : user
           )
         )
       );
       window.localStorage.setItem(
         "digiSetupByEmail",
         JSON.stringify({
           ...setupByEmail,
           [registeredEmail]: {
             role,
             saccoName: form.saccoName || "Digi Sacco",
             saccoId: saccoId
           },
         })
       );

       if (saccoId) {
         window.localStorage.setItem("digiCurrentSaccoId", saccoId.toString());
         window.dispatchEvent(new Event("digi-sacco-updated"));
         saveContributionSettings({
           saccoId,
           contributionAmount: form.contributionAmount,
           contributionFrequency: form.contributionFrequency,
           contributionDescription: form.contributionDescription || "Member contribution",
         });
       }

       // Add transaction to local finance store (will include saccoId)
       if (form.contributionAmount) {
         addTransaction({
           userEmail: registeredEmail,
           memberName: registeredUser?.name || "Member",
           type: "deposit",
           amount: form.contributionAmount,
           description: form.contributionDescription || "Initial contribution",
         });
       }

       // Also update user's sacco association in backend
       try {
         await fetch("http://localhost:5000/api/users/sacco", {
           method: "PUT",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
             email: registeredEmail,
             saccoId: saccoId
           }),
         });
       } catch (backendError) {
         console.error("Error updating user sacco in backend:", backendError);
         // Continue anyway since we have local storage updated
       }
     }

     // Store current sacco ID in local storage for finance filtering
     if (saccoId) {
       window.localStorage.setItem("digiCurrentSaccoId", saccoId.toString());
       window.dispatchEvent(new Event("digi-sacco-updated"));
       saveContributionSettings({
         saccoId,
         contributionAmount: form.contributionAmount,
         contributionFrequency: form.contributionFrequency,
         contributionDescription: form.contributionDescription || "Member contribution",
       });
     }

     if (registeredEmail && form.contributionAmount) {
       // Post initial contribution transaction to backend (will include saccoId)
       fetch("http://localhost:5000/api/transactions", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           userEmail: registeredEmail,
           type: "deposit",
           amount: form.contributionAmount,
           description: form.contributionDescription || "Initial contribution",
           saccoId: saccoId
         }),
       })
         .then((r) => r.json())
         .then((data) => {
           if (data && data.error) console.log("Transaction error:", data.error);
         })
         .catch((err) => console.log("Failed to post transaction:", err))
         .finally(() => {
           alert("Setup completed. Welcome to Digi Sacco!");
           setActivePage("login");
         });
     } else {
       alert("Setup completed. Welcome to Digi Sacco!");
       setActivePage("login");
     }
   };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-form">
            <div className="field-grid">
              <label>
                Sacco Name: *
                <input
                  type="text"
                  placeholder="Name Of The Sacco"
                  value={form.saccoName}
                  onChange={handleChange("saccoName")}
                />
              </label>
              <label>
                How many members in the Sacco?: *
                <input
                  type="number"
                  placeholder="eg 10"
                  value={form.members}
                  onChange={handleChange("members")}
                />
              </label>
            </div>

            <div className="field-grid">
              <label>
                Type of Sacco: *
                <select value={form.type} onChange={handleChange("type")}> 
                  <option value="">--Select type--</option>
                  <option value="credit">Credit Sacco</option>
                  <option value="savings">Savings Sacco</option>
                  <option value="investment">Investment Sacco</option>
                </select>
              </label>
              <label>
                Your Sacco Role: *
                <select value={form.role} onChange={handleChange("role")}> 
                  <option value="">--Select Sacco role--</option>
                  <option value="member">Member</option>
                  <option value="chairperson">Chairperson</option>
                  <option value="treasurer">Treasurer</option>
                  <option value="secretary">Secretary</option>
                </select>
              </label>
            </div>

            <div className="field-grid">
              <label>
                Country of Operation:
                <select value={form.country} onChange={handleChange("country")}> 
                  <option value="Kenya">Kenya</option>
                  <option value="Uganda">Uganda</option>
                  <option value="Tanzania">Tanzania</option>
                </select>
              </label>
              <label>
                Group Currency:
                <select value={form.currency} onChange={handleChange("currency")}> 
                  <option value="Kenya Shilling (KES)">Kenya Shilling (KES)</option>
                  <option value="Uganda Shilling (UGX)">Uganda Shilling (UGX)</option>
                </select>
              </label>
            </div>

            <div className="field-grid radio-row">
              <div>
                <p>Are you a registered entity?: *</p>
                <label>
                  <input
                    type="radio"
                    value="yes"
                    checked={form.registeredEntity === "yes"}
                    onChange={handleChange("registeredEntity")}
                  />
                  Yes
                </label>
                <label>
                  <input
                    type="radio"
                    value="no"
                    checked={form.registeredEntity === "no"}
                    onChange={handleChange("registeredEntity")}
                  />
                  No
                </label>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="step-form">
            <div className="field-grid">
              <label>
                Add Members:
                <textarea
                  rows="5"
                  placeholder="Enter member names or emails, separated by commas"
                  value={form.membersList}
                  onChange={handleChange("membersList")}
                />
              </label>
            </div>
            <div className="field-grid">
              <label>
                Total Members:
                <input
                  type="number"
                  placeholder="Enter expected member count"
                  value={form.members}
                  onChange={handleChange("members")}
                />
              </label>
              <label>
                Membership Notes:
                <input
                  type="text"
                  placeholder="e.g. core team + volunteers"
                  value={form.type}
                  onChange={handleChange("type")}
                />
              </label>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="step-form">
            <div className="field-grid">
              <label>
                Mandatory Contribution Amount:
                <input
                  type="number"
                  placeholder="KES 0.00"
                  value={form.contributionAmount}
                  onChange={handleChange("contributionAmount")}
                />
              </label>
              <label>
                Contribution Frequency:
                <select
                  value={form.contributionFrequency}
                  onChange={handleChange("contributionFrequency")}
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Bi-Weekly">Bi-Weekly</option>
                </select>
              </label>
            </div>
            <div className="field-grid">
              <label>
                Contribution Description:
                <input
                  type="text"
                  placeholder="e.g. member savings contributions"
                  value={form.contributionDescription}
                  onChange={handleChange("contributionDescription")}
                />
              </label>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="step-form">
            <div className="field-grid">
              <label>
                Loan Type Name:
                <input
                  type="text"
                  placeholder="e.g. Emergency Loan"
                  value={form.loanTypeName}
                  onChange={handleChange("loanTypeName")}
                />
              </label>
              <label>
                Interest Rate (%):
                <input
                  type="number"
                  placeholder="e.g. 12"
                  value={form.loanInterest}
                  onChange={handleChange("loanInterest")}
                />
              </label>
            </div>
            <div className="field-grid">
              <label>
                Maximum Loan Amount:
                <input
                  type="number"
                  placeholder="KES 0.00"
                  value={form.loanMaxAmount}
                  onChange={handleChange("loanMaxAmount")}
                />
              </label>
              <label>
                Loan Notes:
                <input
                  type="text"
                  placeholder="e.g. short-term loan product"
                  value={form.loanNotes}
                  onChange={handleChange("loanNotes")}
                />
              </label>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="step-form">
            <div className="field-grid">
              <label>
                Bank Name:
                <input
                  type="text"
                  placeholder="e.g. KCB Bank"
                  value={form.bankName}
                  onChange={handleChange("bankName")}
                />
              </label>
              <label>
                Account Number:
                <input
                  type="text"
                  placeholder="e.g. 1234567890"
                  value={form.accountNumber}
                  onChange={handleChange("accountNumber")}
                />
              </label>
            </div>
            <div className="field-grid">
              <label>
                Bank Branch:
                <input
                  type="text"
                  placeholder="e.g. Nairobi - Westlands"
                  value={form.bankBranch}
                  onChange={handleChange("bankBranch")}
                />
              </label>
              <label>
                Account Currency:
                <select value={form.currency} onChange={handleChange("currency")}> 
                  <option value="Kenya Shilling (KES)">Kenya Shilling (KES)</option>
                  <option value="Uganda Shilling (UGX)">Uganda Shilling (UGX)</option>
                </select>
              </label>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="step-form">
            <div className="field-grid">
              <div>
                <h3>Review your setup</h3>
                <p>
                  Confirm the Sacco setup details below before completing.
                </p>
              </div>
            </div>
            <div className="field-grid">
              <label>
                Sacco Name
                <input type="text" value={form.saccoName} readOnly />
              </label>
              <label>
                Total Members
                <input type="text" value={form.members} readOnly />
              </label>
            </div>
            <div className="field-grid">
              <label>
                Contribution Amount
                <input type="text" value={form.contributionAmount} readOnly />
              </label>
              <label>
                Contribution Frequency
                <input type="text" value={form.contributionFrequency} readOnly />
              </label>
            </div>
            <div className="field-grid">
              <label>
                Loan Type
                <input type="text" value={form.loanTypeName} readOnly />
              </label>
              <label>
                Bank Name
                <input type="text" value={form.bankName} readOnly />
              </label>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="register-setup-shell">
      <div className="register-setup-card">
        <div className="wizard-sidebar">
          <h3>Register Sacco</h3>
          <ol>
            {steps.map((step, index) => (
              <li key={step} className={currentStep === index + 1 ? "active" : ""}>
                <span>{index + 1}</span>
                <div>
                  <strong>{step}</strong>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="wizard-content">
          <div className="wizard-header">
            <p>-- Register Sacco --</p>
            <div className="header-actions">
              <button onClick={() => setActivePage("landing")}>Home</button>
            </div>
          </div>

          <div className="wizard-panel">
            <div className="panel-title">
              <h2>{steps[currentStep - 1]}</h2>
            </div>
            {renderStepContent()}
          </div>

          <div className="wizard-footer">
            <button className="secondary" onClick={goBack} disabled={currentStep === 1}>
              Back
            </button>
            {currentStep < steps.length ? (
              <button className="primary" onClick={goNext}>
                Next
              </button>
            ) : (
              <button className="primary" onClick={handleComplete}>
                Complete Setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterSetup;
