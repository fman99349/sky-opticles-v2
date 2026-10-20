import React from 'react';

export default function Placeholder({ title, note }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p className="muted">{note}</p>
    </div>
  );
}
