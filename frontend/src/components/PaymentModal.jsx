import React, { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PaymentModal = ({ totalAmount, onConfirm, onClose, loading = false }) => {
  const [cash, setCash] = useState(parseFloat(totalAmount) || 0);
  const [card, setCard] = useState(0);
  const [bankTransfer, setBankTransfer] = useState(0);
  const [notes, setNotes] = useState("");
  const [numberPadTarget, setNumberPadTarget] = useState(null);
  const [showNumberPad, setShowNumberPad] = useState(false);
  const [useOtherPaymentMethods, setUseOtherPaymentMethods] = useState(false); // 👈 NEW

  // Reset card & bank when disabling other methods
  const toggleOtherPayments = () => {
    const newValue = !useOtherPaymentMethods;
    setUseOtherPaymentMethods(newValue);
    if (!newValue) {
      setCard(0);
      setBankTransfer(0);
    }
  };

  const totalPaid = (parseFloat(cash) || 0) + 
                    (useOtherPaymentMethods ? (parseFloat(card) || 0) : 0) + 
                    (useOtherPaymentMethods ? (parseFloat(bankTransfer) || 0) : 0);
  const changeDue = Math.max(0, totalPaid - totalAmount).toFixed(2);

  const handleSubmit = () => {
    if (totalPaid < totalAmount) {
      toast.warn("Total paid must be equal or greater than order total");
      return;
    }
    onConfirm({ 
      cash, 
      card: useOtherPaymentMethods ? card : 0, 
      bankTransfer: useOtherPaymentMethods ? bankTransfer : 0, 
      totalPaid, 
      changeDue, 
      notes 
    });
  };

  // Handle manual keyboard input
  const handleInputChange = (field, value) => {
    // Allow empty, digits, and one decimal point
    if (value === '' || /^(\d*\.?\d*)$/.test(value)) {
      const numValue = value === '' ? 0 : parseFloat(value);
      if (field === 'cash') setCash(numValue || 0);
      else if (field === 'card') setCard(numValue || 0);
      else setBankTransfer(numValue || 0);
    }
  };

  // Number pad handlers
  const handleNumberPadInput = (value) => {
    if (!numberPadTarget) return;

    const current = String(
      numberPadTarget === 'cash' ? (cash || 0) :
      numberPadTarget === 'card' ? (card || 0) : (bankTransfer || 0)
    ).replace(/^0+/, '') || '0';

    let newValue;
    if (value === '.') {
      if (!current.includes('.')) newValue = current + '.';
      else return;
    } else {
      if (current === '0' && !current.includes('.')) {
        newValue = value;
      } else {
        newValue = current + value;
      }
    }

    const numValue = parseFloat(newValue) || 0;
    if (numberPadTarget === 'cash') setCash(numValue);
    else if (numberPadTarget === 'card') setCard(numValue);
    else setBankTransfer(numValue);
  };

  const handleClear = () => {
    if (!numberPadTarget) return;

    if (numberPadTarget === 'cash') setCash(0);
    else if (numberPadTarget === 'card') setCard(0);
    else setBankTransfer(0);
  };

  const handleBackspace = () => {
    if (!numberPadTarget) return;

    const current = String(
      numberPadTarget === 'cash' ? (cash || 0) :
      numberPadTarget === 'card' ? (card || 0) : (bankTransfer || 0)
    );

    if (current.length <= 1 || (current === '0.')) {
      if (numberPadTarget === 'cash') setCash(0);
      else if (numberPadTarget === 'card') setCard(0);
      else setBankTransfer(0);
    } else {
      const newValue = current.slice(0, -1);
      const numValue = parseFloat(newValue) || 0;
      if (numberPadTarget === 'cash') setCash(numValue);
      else if (numberPadTarget === 'card') setCard(numValue);
      else setBankTransfer(numValue);
    }
  };

  const handleDecimal = () => {
    if (!numberPadTarget) return;
    const current = String(
      numberPadTarget === 'cash' ? (cash || 0) :
      numberPadTarget === 'card' ? (card || 0) : (bankTransfer || 0)
    );
    if (!current.includes('.')) {
      handleNumberPadInput('.');
    }
  };

  const focusField = (field) => {
    setNumberPadTarget(field);
    setShowNumberPad(true);
  };

  const symbol = localStorage.getItem("currencySymbol") || "$";

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Record Payment</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="row mb-3">
              <div className="col-md-6">
                <h4>Order Total: <strong>{symbol}{totalAmount.toFixed(2)}</strong></h4>
              </div>
              <div className="col-md-6 text-end">
                <h4>Total Paid: <strong>{symbol}{totalPaid.toFixed(2)}</strong></h4>
              </div>
            </div>

            <hr />

            <div className="row g-4">
              {/* Left: Inputs */}
              <div className="col-md-7">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Cash ({symbol})</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={cash === 0 ? '' : cash}
                      onChange={(e) => handleInputChange('cash', e.target.value)}
                      onFocus={() => focusField('cash')}
                      className="form-control text-end"
                      placeholder="0.00"
                    />
                  </div>
                  {useOtherPaymentMethods && (
                    <>
                      <div className="col-md-4">
                        <label className="form-label">Card ({symbol})</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={card === 0 ? '' : card}
                          onChange={(e) => handleInputChange('card', e.target.value)}
                          onFocus={() => focusField('card')}
                          className="form-control text-end"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Bank Transfer ({symbol})</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={bankTransfer === 0 ? '' : bankTransfer}
                          onChange={(e) => handleInputChange('bankTransfer', e.target.value)}
                          onFocus={() => focusField('bankTransfer')}
                          className="form-control text-end"
                          placeholder="0.00"
                        />
                      </div>
                    </>
                  )}
                  {/* Checkbox to toggle other methods */}
                  <div className="col-md-12 mt-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="otherPayments"
                        checked={useOtherPaymentMethods}
                        onChange={toggleOtherPayments}
                      />
                      <label className="form-check-label" htmlFor="otherPayments">
                        Use other payment methods (Card / Bank Transfer)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="form-label">Notes (Optional)</label>
                  <textarea
                    rows="2"
                    className="form-control"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="mt-3">
                  <h5>
                    Change Due: <span className="text-success">{symbol}{changeDue}</span>
                  </h5>
                </div>

                <div className="mt-4 d-flex justify-content-between">
                  <button 
                    className="btn btn-secondary" 
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-success" 
                    onClick={handleSubmit}
                    disabled={loading} // ✅ disable during submit
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Processing...
                      </>
                    ) : (
                      "Confirm Payment"
                    )}
                  </button>
                </div>
              </div>

              {/* Right: Number Pad */}
              <div className="col-md-5">
                {showNumberPad ? (
                  <div>
                    <div className="d-flex justify-content-between mb-2">
                      <small>Enter amount for {numberPadTarget}</small>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowNumberPad(false)}>
                        ✕
                      </button>
                    </div>
                    <div className="bg-light p-3 rounded shadow-sm">
                      <div className="row g-2">
                        {/* Row 1 */}
                        <div className="col-6">
                          <button
                            className="btn btn-outline-danger w-100 py-2 border"
                            onClick={handleClear}
                          >
                            C
                          </button>
                        </div>
                        <div className="col-6">
                          <button
                            className="btn btn-light w-100 py-2 border"
                            onClick={handleBackspace}
                          >
                            ⌫
                          </button>
                        </div>

                        {/* Row 2 */}
                        <div className="col-4">
                          <button
                            className="btn btn-light w-100 py-2 border"
                            onClick={() => handleNumberPadInput('7')}
                          >
                            7
                          </button>
                        </div>
                        <div className="col-4">
                          <button
                            className="btn btn-light w-100 py-2 border"
                            onClick={() => handleNumberPadInput('8')}
                          >
                            8
                          </button>
                        </div>
                        <div className="col-4">
                          <button
                            className="btn btn-light w-100 py-2 border"
                            onClick={() => handleNumberPadInput('9')}
                          >
                            9
                          </button>
                        </div>

                        {/* Row 3 */}
                        <div className="col-4">
                          <button
                            className="btn btn-light w-100 py-2 border"
                            onClick={() => handleNumberPadInput('4')}
                          >
                            4
                          </button>
                        </div>
                        <div className="col-4">
                          <button
                            className="btn btn-light w-100 py-2 border"
                            onClick={() => handleNumberPadInput('5')}
                          >
                            5
                          </button>
                        </div>
                        <div className="col-4">
                          <button
                            className="btn btn-light w-100 py-2 border"
                            onClick={() => handleNumberPadInput('6')}
                          >
                            6
                          </button>
                        </div>

                        {/* Row 4 */}
                        <div className="col-4">
                          <button
                            className="btn btn-light w-100 py-2 border"
                            onClick={() => handleNumberPadInput('1')}
                          >
                            1
                          </button>
                        </div>
                        <div className="col-4">
                          <button
                            className="btn btn-light w-100 py-2 border"
                            onClick={() => handleNumberPadInput('2')}
                          >
                            2
                          </button>
                        </div>
                        <div className="col-4">
                          <button
                            className="btn btn-light w-100 py-2 border"
                            onClick={() => handleNumberPadInput('3')}
                          >
                            3
                          </button>
                        </div>

                        {/* Row 5 */}
                        <div className="col-4">
                          <button
                            className="btn btn-light w-100 py-2 border"
                            onClick={() => handleNumberPadInput('0')}
                          >
                            0
                          </button>
                        </div>
                        <div className="col-4">
                          <button
                            className="btn btn-light w-100 py-2 border"
                            onClick={handleDecimal}
                          >
                            .
                          </button>
                        </div>
                        <div className="col-4">
                          <button
                            className="btn btn-success w-100 py-2"
                            onClick={() => setShowNumberPad(false)}
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted small d-flex align-items-center" style={{ height: '200px' }}>
                    Tap any amount field to open number pad
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default PaymentModal;