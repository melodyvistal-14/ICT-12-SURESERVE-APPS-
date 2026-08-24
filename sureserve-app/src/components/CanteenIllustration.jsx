import React from 'react';

export default function CanteenIllustration({ style = {} }) {
  return (
    <div style={{ width: '100%', maxWidth: '340px', margin: '0 auto', ...style }}>
      <svg
        viewBox="0 0 400 350"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {/* Background Shelf */}
        <rect x="20" y="80" width="160" height="110" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" rx="4" />
        <line x1="20" y1="115" x2="180" y2="115" stroke="#E2E8F0" strokeWidth="2" />
        <line x1="20" y1="150" x2="180" y2="150" stroke="#E2E8F0" strokeWidth="2" />

        {/* Shelves Items (Bowls/Cups) */}
        <ellipse cx="40" cy="105" rx="10" ry="6" fill="#A7F3D0" />
        <ellipse cx="70" cy="105" rx="10" ry="6" fill="#FDE68A" />
        <ellipse cx="100" cy="105" rx="10" ry="6" fill="#FCA5A5" />
        <ellipse cx="130" cy="105" rx="10" ry="6" fill="#FECACA" />
        <path d="M150 90 L160 90 L160 110 L150 110 Z" fill="#60A5FA" opacity="0.6" />
        <line x1="153" y1="82" x2="148" y2="72" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />

        <ellipse cx="45" cy="140" rx="12" ry="7" fill="#F472B6" />
        <path d="M75 130 Q75 140 85 140 Q95 140 95 130 Z" fill="#FBBF24" />
        <ellipse cx="120" cy="140" rx="10" ry="6" fill="#A7F3D0" />
        <ellipse cx="150" cy="140" rx="10" ry="6" fill="#FDE68A" />

        <path d="M40 170 L50 170 L50 190 L40 190 Z" fill="#38BDF8" opacity="0.7" />
        <line x1="43" y1="162" x2="38" y2="152" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />

        <path d="M135 170 L145 170 L145 190 L135 190 Z" fill="#F59E0B" opacity="0.8" />
        <line x1="138" y1="162" x2="133" y2="152" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />

        {/* Canteen Counter */}
        <rect x="0" y="190" width="400" height="120" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="3" />
        <line x1="0" y1="190" x2="400" y2="190" stroke="#CBD5E1" strokeWidth="6" />

        {/* Counter Vertical Panels */}
        <line x1="60" y1="196" x2="60" y2="305" stroke="#F1F5F9" strokeWidth="4" />
        <line x1="120" y1="196" x2="120" y2="305" stroke="#F1F5F9" strokeWidth="4" />
        <line x1="180" y1="196" x2="180" y2="305" stroke="#F1F5F9" strokeWidth="4" />
        <line x1="240" y1="196" x2="240" y2="305" stroke="#F1F5F9" strokeWidth="4" />
        <line x1="300" y1="196" x2="300" y2="305" stroke="#F1F5F9" strokeWidth="4" />
        <line x1="360" y1="196" x2="360" y2="305" stroke="#F1F5F9" strokeWidth="4" />

        {/* --- CHEF (Center) --- */}
        <g id="chef">
          {/* Chef Hat */}
          <path d="M200 45 Q200 25 220 25 Q240 25 240 45 Q250 45 250 65 Q250 85 240 85 L200 85 Q190 85 190 65 Q190 45 200 45 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
          <rect x="202" y="80" width="36" height="15" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />

          {/* Chef Head */}
          <circle cx="220" cy="110" r="22" fill="#FED7AA" />
          <path d="M202 96 Q220 90 238 96 Q240 102 238 108 L202 108 Z" fill="#78350F" />
          <circle cx="208" cy="115" r="4" fill="#F472B6" opacity="0.6" />
          <circle cx="232" cy="115" r="4" fill="#F472B6" opacity="0.6" />
          <circle cx="212" cy="110" r="2.5" fill="#1E293B" />
          <circle cx="228" cy="110" r="2.5" fill="#1E293B" />
          <path d="M214 119 Q220 125 226 119" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Chef Body */}
          <path d="M185 132 Q220 128 255 132 L265 190 L175 190 Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
          <circle cx="212" cy="145" r="2.5" fill="#94A3B8" />
          <circle cx="228" cy="145" r="2.5" fill="#94A3B8" />
          <circle cx="212" cy="162" r="2.5" fill="#94A3B8" />
          <circle cx="228" cy="162" r="2.5" fill="#94A3B8" />

          {/* Chef Arms holding plate */}
          <path d="M185 140 Q160 170 250 175" stroke="#FED7AA" strokeWidth="12" strokeLinecap="round" fill="none" />
          <path d="M255 140 Q280 170 270 175" stroke="#FED7AA" strokeWidth="12" strokeLinecap="round" fill="none" />

          {/* Served Plate */}
          <ellipse cx="280" cy="168" rx="30" ry="10" fill="#38BDF8" />
          <ellipse cx="280" cy="167" rx="22" ry="6" fill="#34D399" />
          <ellipse cx="270" cy="166" rx="6" ry="4" fill="#F87171" />
          <ellipse cx="290" cy="166" rx="7" ry="4" fill="#FBBF24" />
        </g>

        {/* --- STUDENT BOY (Left) --- */}
        <g id="student-boy">
          <rect x="75" y="150" width="30" height="55" rx="8" fill="#0284C7" />
          <path d="M90 155 Q115 150 130 155 L135 225 L85 225 Z" fill="#F59E0B" />
          <circle cx="100" cy="170" r="2.5" fill="#B45309" />
          <circle cx="118" cy="175" r="2.5" fill="#B45309" />
          <circle cx="105" cy="190" r="2.5" fill="#B45309" />
          <circle cx="122" cy="205" r="2.5" fill="#B45309" />

          <path d="M85 225 L135 225 L130 325 L108 325 L108 270 L102 270 L102 325 L80 325 Z" fill="#166534" />
          <ellipse cx="90" cy="330" rx="14" ry="6" fill="#1E293B" />
          <ellipse cx="120" cy="330" rx="14" ry="6" fill="#1E293B" />

          <circle cx="110" cy="120" r="20" fill="#FED7AA" />
          <path d="M90 115 C90 98 130 98 130 115 C125 110 110 108 90 115 Z" fill="#1E3A8A" />
          <circle cx="100" cy="125" r="3.5" fill="#F472B6" opacity="0.7" />
          <circle cx="105" cy="120" r="2.5" fill="#1E293B" />
          <circle cx="118" cy="120" r="2.5" fill="#1E293B" />
          <path d="M107 127 Q112 131 117 127" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" fill="none" />

          <rect x="125" y="186" width="60" height="12" rx="3" fill="#A3E635" />
          <ellipse cx="145" cy="189" rx="10" ry="4" fill="#34D399" />
          <ellipse cx="165" cy="189" rx="8" ry="4" fill="#F87171" />
        </g>

        {/* --- STUDENT GIRL (Right) --- */}
        <g id="student-girl">
          <rect x="330" y="150" width="30" height="55" rx="8" fill="#0EA5E9" />
          <circle cx="310" cy="115" r="19" fill="#FED7AA" />
          <path d="M290 110 C290 92 330 92 330 110 L335 90 Q345 80 340 75 Q335 70 325 80" fill="#7C2D12" stroke="#7C2D12" strokeWidth="3" />
          <circle cx="300" cy="120" r="3.5" fill="#F472B6" opacity="0.7" />
          <circle cx="302" cy="114" r="2.5" fill="#1E293B" />
          <circle cx="315" cy="114" r="2.5" fill="#1E293B" />
          <path d="M304 122 Q310 126 316 122" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" fill="none" />

          <path d="M290 145 Q310 140 330 145 L335 200 L285 200 Z" fill="#FACC15" />
          <path d="M285 200 L335 200 L350 250 Q310 260 270 250 Z" fill="#4ADE80" />
          <path d="M270 250 Q310 260 350 250" stroke="#166534" strokeWidth="3" fill="none" />

          <rect x="295" y="250" width="10" height="60" fill="#FED7AA" />
          <rect x="315" y="250" width="10" height="60" fill="#FED7AA" />
          <path d="M292 300 L308 300 L308 335 L288 335 Z" fill="#06B6D4" />
          <path d="M312 300 L328 300 L328 335 L308 335 Z" fill="#06B6D4" />

          <path d="M290 150 Q260 170 275 174" stroke="#FED7AA" strokeWidth="10" strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </div>
  );
}
