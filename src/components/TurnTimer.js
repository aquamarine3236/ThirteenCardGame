import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

export default function TurnTimer({ deadlineAt }) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [deadlineAt]);

  if (!Number.isFinite(deadlineAt)) return null;
  const secondsLeft = Math.max(0, Math.ceil((deadlineAt - now) / 1000));

  return (
    <div className="turn-timer" role="timer" aria-label="Thời gian lượt còn lại">
      Còn {secondsLeft} giây
    </div>
  );
}

TurnTimer.propTypes = {
  deadlineAt: PropTypes.number,
};
