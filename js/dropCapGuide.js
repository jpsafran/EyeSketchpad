// Data for each category and drop
// Mapping of drop cap categories to modal background and font color
const dropCapColors = {
    teal:      { bg: '#008080', color: '#fff' },
    white:     { bg: '#fff', color: '#333' },
    yellow:    { bg: '#FFD700', color: '#333' },
    lightblue: { bg: '#ADD8E6', color: '#333' },
    darkblue:  { bg: '#00008B', color: '#fff' },
    lightgreen:{ bg: '#90EE90', color: '#333' },
    orange:    { bg: '#FF8C00', color: '#fff' },
    purple:    { bg: '#800080', color: '#fff' },
    darkgreen: { bg: '#006400', color: '#fff' },
    red:       { bg: '#FF0000', color: '#fff' },
    pink:      { bg: '#FF69B4', color: '#fff' },
    gray:      { bg: '#808080', color: '#fff' },
    tan:       { bg: '#D2B48C', color: '#333' },
    black:     { bg: '#000', color: '#fff' },
    'white-nocap': { bg: '#fff', color: '#333' }
};

// Utility to set modal color based on category
function setModalColor(category) {
    // Instead of coloring modal background, color the class name box at the top
    const colors = dropCapColors[category] || { bg: '#fff', color: '#333' };
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.style.background = colors.bg;
        modalTitle.style.color = colors.color;
        modalTitle.style.borderRadius = '10px';
        modalTitle.style.padding = '0.5em 1em';
        modalTitle.style.display = 'inline-block';
        modalTitle.style.marginBottom = '0.5em';
    }

    // Restore modal description subtext color to original for best readability
    const modalCategoryDesc = document.getElementById('modalCategoryDesc');
    if (modalCategoryDesc) {
        modalCategoryDesc.style.color = '#666';
    }
    // Keep drop-attr subtext color as before (optional: you can remove this block if you want all subtext to be default)
    const dropAttrs = document.querySelectorAll('#modal .drop-attr');
    dropAttrs.forEach(function(attr) {
        attr.style.color = '';
    });
}

// Example: Call setModalColor(category) when opening the modal
function openDropModal(category) {
    setModalColor(category);
    // ...existing code to populate modal content...
    document.getElementById('modal').style.display = 'flex';
}
function openDropModal(category, generic) {
    const modal = document.getElementById('modal');
    const modalContent = modal.querySelector('.modal-content');
    if (!dropData[category]) return;
    const cat = dropData[category];
    // Set modal color
    setModalColor(category);
    // Title and desc
    modalContent.querySelector('#modalTitle').textContent = cat.name || '';
    modalContent.querySelector('#modalCategoryDesc').textContent = cat.desc || '';
    // List drops
    const dropList = modalContent.querySelector('#dropList');
    let drops = cat.drops || [];
    if (generic) {
        drops = drops.filter(d => d.generic && d.generic.toLowerCase() === generic.toLowerCase());
    }
    if (!drops.length) {
        dropList.innerHTML = '<div style="color:#800;font-size:1.08em;">No drop details found.</div>';
    } else {
        dropList.innerHTML = drops.map(drop => `
            <div class="drop-item">
                <div class="drop-title">${drop.generic} <span style="color:#888;font-weight:400;">(${drop.brand})</span></div>
                <div class="drop-attr"><strong>Class:</strong> ${drop.class}</div>
                <div class="drop-attr"><strong>Concentration:</strong> ${drop.concentration||''}</div>
                <div class="drop-attr"><strong>Dose:</strong> ${drop.adult_dose||''}</div>
                <div class="drop-attr"><strong>MOA:</strong> ${drop.moa||''}</div>
                <div class="drop-attr"><strong>Ocular SE:</strong> ${drop.ocular_side_effects||''}</div>
                <div class="drop-attr"><strong>Systemic SE:</strong> ${drop.systemic_side_effects||''}</div>
                <div class="drop-attr"><strong>Cautions/CI:</strong> ${drop.cautions_contraindications||''}</div>
                <div class="drop-attr"><strong>Storage/Vehicle:</strong> ${drop.storage_vehicle||''}</div>
                <div class="drop-attr"><strong>Pearls:</strong> ${drop.pearls||''}</div>
            </div>
        `).join('');
    }
    modal.style.display = 'flex';
    // Close button
    const closeBtn = modalContent.querySelector('.modal-close') || document.getElementById('modalClose');
    if (closeBtn) {
        closeBtn.onclick = function() { modal.style.display = 'none'; };
    }
    // Close on outside click
    window.onclick = function(event) {
        if (event.target === modal) modal.style.display = 'none';
    };
}

// Attach event listeners to dropcap-category elements and search
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.dropcap-category').forEach(el => {
        el.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            openDropModal(category);
        });
    });

    // --- Improved Search Feature ---
    const dropSearch = document.getElementById('dropSearch');
    const searchResults = document.getElementById('searchResults');

    // Helper: flatten all drops into a single array with category info
    function getAllDrops() {
        const drops = [];
        for (const [catKey, cat] of Object.entries(dropData)) {
            if (cat.drops) {
                cat.drops.forEach(drop => {
                    drops.push({ ...drop, catKey, catName: cat.name, capColor: cat.capColor || catKey });
                });
            }
        }
        return drops;
    }

    // Helper: highlight keyword in result
    function highlight(text, keyword) {
        if (!keyword) return text;
        return text.replace(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<mark>$1</mark>');
    }

    // Render search results
    function renderSearchResults(results, keyword) {
        if (!searchResults) return;
        if (!keyword) { searchResults.innerHTML = ''; return; }
        if (!results.length) {
            searchResults.innerHTML = '<div style="color:#800;font-size:1.08em;background:#fff8f8;border-radius:8px;padding:0.7em 1em;">No drops found for "' + keyword + '".</div>';
            return;
        }
        searchResults.innerHTML = results.map(drop => `
            <div class="drop-item" style="background:#f8f8f8;border-radius:8px;padding:0.7em 1em;margin-bottom:0.7em;cursor:pointer;box-shadow:0 1px 4px #0001;display:flex;align-items:center;gap:1em;" data-cat="${drop.catKey}" data-generic="${encodeURIComponent(drop.generic)}">
                <span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:${dropCapColors[drop.capColor]?.bg||'#eee'};border:1.5px solid #bbb;margin-right:0.7em;"></span>
                <span style="color:#222;font-weight:600;">${highlight(drop.generic, keyword)}</span>
                <span style="color:#666;font-size:0.97em;margin-left:0.7em;">${highlight(drop.brand, keyword)}</span>
                <span style="color:#888;font-size:0.93em;margin-left:auto;">${highlight(drop.class||drop.catName, keyword)}</span>
            </div>
        `).join('');
        // Attach click listeners to each result
        Array.from(searchResults.querySelectorAll('.drop-item')).forEach(item => {
            item.onclick = function() {
                const cat = item.getAttribute('data-cat');
                const generic = decodeURIComponent(item.getAttribute('data-generic'));
                openDropModal(cat, generic);
            };
        });
    }

    // Search logic: match any keyword in generic, brand, or class/category
    function searchDrops(keyword) {
        if (!keyword) return [];
        const kw = keyword.trim().toLowerCase();
        if (!kw) return [];
        return getAllDrops().filter(drop =>
            (drop.generic && drop.generic.toLowerCase().includes(kw)) ||
            (drop.brand && drop.brand.toLowerCase().includes(kw)) ||
            (drop.class && drop.class.toLowerCase().includes(kw)) ||
            (drop.catName && drop.catName.toLowerCase().includes(kw))
        );
    }

    if (dropSearch) {
        dropSearch.addEventListener('input', function() {
            const keyword = dropSearch.value;
            const results = searchDrops(keyword);
            renderSearchResults(results, keyword);
        });
    }
});
const dropData = {
    teal: {
    name: "Prostaglandin-family First-line Drops",
    desc: "Teal (turquoise) cap. Once-daily agents that ↑ aqueous out-flow.",
    drops: [
        { generic: "Latanoprost", brand: "Xalatan", class: "Prostaglandin analog", concentration: "0.005 %", adult_dose: "QHS", moa: "↑ uveoscleral (± TM) out-flow", ocular_side_effects: "Hyperemia, iris/lid pigment, lash growth, CME risk (aphakia)", systemic_side_effects: "Minimal", cautions_contraindications: "Active uveitis, CME, herpetic keratitis", storage_vehicle: "Refrigerate unopened; 6 wk RT after opening; BAK 0.02 %", pearls: "Cost-effective; mean IOP reduction ≈ 30 %; lowest hyperemia rate among PGAs" },
        { generic: "Travoprost", brand: "Travatan Z", class: "Prostaglandin analog", concentration: "0.004 %", adult_dose: "QHS", moa: "↑ uveoscleral out-flow", ocular_side_effects: "Hyperemia > latanoprost", systemic_side_effects: "Minimal", cautions_contraindications: "Class-wide", storage_vehicle: "RT; SofZia (BAK-free)", pearls: "Contains SofZia preservative with lower ocular-surface toxicity; tolerated in BAK intolerance" },
        { generic: "Bimatoprost", brand: "Lumigan 0.01 %", class: "Prostaglandin analog", concentration: "0.01 % (current) / 0.03 % (legacy)", adult_dose: "QHS", moa: "↑ uveoscleral out-flow (FP-receptor)", ocular_side_effects: "Marked lash/dermal hypertrichosis, hyperemia", systemic_side_effects: "Minimal", cautions_contraindications: "Class-wide", storage_vehicle: "RT; BAK 0.02 %", pearls: "Produces pronounced lash growth; associated with periocular fat atrophy; higher subjective sensation than other PGAs" },
        { generic: "Tafluprost", brand: "Zioptan", class: "Prostaglandin analog", concentration: "0.0015 % PF single-use", adult_dose: "QHS", moa: "↑ uveoscleral out-flow", ocular_side_effects: "Class-like", systemic_side_effects: "Minimal", cautions_contraindications: "Class-wide", storage_vehicle: "Refrigerate; opened vial stable ≤ 12 h RT; PF", pearls: "Only preservative-free PGA; favoured in severe ocular-surface disease and post-keratoplasty" },
        { generic: "Latanoprostene bunod", brand: "Vyzulta", class: "PGA + NO-donor", concentration: "0.024 %", adult_dose: "QHS", moa: "↑ uveoscleral + NO-mediated TM out-flow", ocular_side_effects: "Class-like", systemic_side_effects: "Minimal", cautions_contraindications: "Class-wide", storage_vehicle: "RT; BAK 0.02 %", pearls: "NO pathway confers additional mean IOP reduction of 1–3 mmHg over latanoprost" },
        { generic: "Omidenepag isopropyl", brand: "Omlonti", class: "Selective EP2 agonist", concentration: "0.002 %", adult_dose: "QHS", moa: "↑ TM & uveoscleral out-flow (EP2)", ocular_side_effects: "Hyperemia, possible periocular pigment/lash change", systemic_side_effects: "Minimal", cautions_contraindications: "Monitor iris pigment", storage_vehicle: "Refrigerate unopened; discard 31 d after opening; BAK-free", pearls: "EP2-agonist alternative that lacks prostamide-associated periocular fat atrophy; FDA-approved 2022" }
    ]
},
white: {
    name: "ROCK Inhibitors & Misc.",
    desc: "White cap. Rho-kinase inhibitors ± combos.",
    drops: [
        { generic: "Netarsudil", brand: "Rhopressa", class: "ROCK inhibitor", concentration: "0.02 %", adult_dose: "QHS", moa: "↓ TM resistance & episcleral venous pressure", ocular_side_effects: "Conjunctival hyperemia, corneal verticillata, instillation pain, subconj hemorrhage", systemic_side_effects: "Minimal", cautions_contraindications: "Caution baseline corneal edema", storage_vehicle: "Refrigerate unopened; 6 wk RT after opening; BAK 0.015 %", pearls: "Lowers episcleral venous pressure, benefiting normal-tension glaucoma; hyperemia in > 50 % often transient; verticillata reversible" },
        { generic: "Netarsudil + Latanoprost", brand: "Rocklatan", class: "ROCK + PGA combo", concentration: "0.02 % + 0.005 %", adult_dose: "QHS", moa: "Dual actions (see components)", ocular_side_effects: "Hyperemia > monotherapy", systemic_side_effects: "Minimal", cautions_contraindications: "See individual agents", storage_vehicle: "Refrigerate unopened; 6 wk RT after opening; BAK 0.02 %", pearls: "Fixed combination provides additional mean IOP lowering of 1–2 mmHg over latanoprost; associated with corneal verticillata similar to netarsudil" }
    ]
},
yellow: {
    name: "β-Blockers 0.5 %",
    desc: "Yellow cap. Non-selective β-blockers.",
    drops: [
        { generic: "Timolol maleate", brand: "Timoptic 0.5 %", class: "Non-selective β-blocker", concentration: "0.5 %", adult_dose: "BID (QD gel)", moa: "↓ aqueous production (CB β-2)", ocular_side_effects: "Sting, dry eye", systemic_side_effects: "Bradycardia, bronchospasm, hypotension, masks hypoglycemia", cautions_contraindications: "Asthma, COPD, bradycardia, AV-block", storage_vehicle: "RT; BAK 0.01 %", pearls: "Morning administration aligns with diurnal IOP peak; gel-forming XE formulation enables once-daily dosing; may mask hypoglycemia in diabetes" },
        { generic: "Levobunolol", brand: "Betagan", class: "Non-selective β-blocker", concentration: "0.5 %", adult_dose: "BID", moa: "Same as timolol", ocular_side_effects: "Similar", systemic_side_effects: "Similar", cautions_contraindications: "Same", storage_vehicle: "RT; BAK 0.004%", pearls: "Once-daily dosing shows efficacy comparable to twice-daily timolol; longer systemic half-life necessitates pulse/BP monitoring" },
        { generic: "Carteolol", brand: "Ocupress 1 %", class: "Non-selective β-blocker w/ISA", concentration: "1 %", adult_dose: "BID", moa: "↓ aqueous production", ocular_side_effects: "Less sting", systemic_side_effects: "Fewer CNS/sexual AEs", cautions_contraindications: "Same", storage_vehicle: "RT; BAK 0.005 %", pearls: "Intrinsic sympathomimetic activity linked to reduced resting bradycardia and fewer CNS adverse events" },
        { generic: "Metipranolol", brand: "OptiPranolol 0.3 %", class: "Non-selective β-blocker", concentration: "0.3 %", adult_dose: "BID", moa: "↓ aqueous production", ocular_side_effects: "Similar to timolol; rare granulomatous uveitis", systemic_side_effects: "Similar", cautions_contraindications: "Same", storage_vehicle: "RT; BAK 0.004 %", pearls: "0.3 % concentration exhibits efficacy similar to 0.5 % timolol; granulomatous anterior uveitis reported rarely" }
    ]
},
lightblue: {
    name: "β-Blockers 0.25 %",
    desc: "Light-blue cap. Lower-strength β-blockers.",
    drops: [
        { generic: "Timolol maleate", brand: "Timoptic 0.25 %", class: "β-blocker", concentration: "0.25 %", adult_dose: "BID", moa: "↓ aqueous production", ocular_side_effects: "As above", systemic_side_effects: "Reduced vs 0.5 %", cautions_contraindications: "As above", storage_vehicle: "RT; BAK 0.01 %", pearls: "Lower concentration suitable for light irides and mild pulmonary disease; efficacy comparable in eyes with lower baseline IOP" },
        { generic: "Betaxolol", brand: "Betoptic-S 0.25 %", class: "β-1 selective blocker", concentration: "0.25 % suspension", adult_dose: "BID", moa: "↓ aqueous via β-1", ocular_side_effects: "Sting (susp)", systemic_side_effects: "Minimal pulmonary effects", cautions_contraindications: "Caution in severe COPD", storage_vehicle: "Shake; BAK 0.01 %", pearls: "β1-selectivity confers minimal pulmonary effect; neuroprotective benefit unconfirmed; mean IOP reduction ≈ 0.8-1 mmHg less than timolol" }
    ]
},
darkblue: {
    name: "β-Blocker Combos",
    desc: "Dark-blue cap. Fixed combinations with timolol.",
    drops: [
        { generic: "Dorzolamide + Timolol", brand: "Cosopt", class: "CAI + β-blocker", concentration: "2 % + 0.5 %", adult_dose: "BID", moa: "Dual ↓ aqueous", ocular_side_effects: "Sting, dysgeusia", systemic_side_effects: "β-blocker AEs", cautions_contraindications: "Sulfa allergy, asthma, bradycardia", storage_vehicle: "RT; BAK 0.0075 %", pearls: "Preservative-free single-dose version available; produces mean IOP reduction around 30 %" },
        { generic: "Brimonidine + Timolol", brand: "Combigan", class: "α-2 agonist + β-blocker", concentration: "0.2 % + 0.5 %", adult_dose: "BID", moa: "Dual ↓ aqueous", ocular_side_effects: "Allergic conjunctivitis (brimonidine), sting", systemic_side_effects: "β-blocker AEs, fatigue", cautions_contraindications: "Asthma, MAO-I, age < 2 yr", storage_vehicle: "RT; BAK 0.005 %", pearls: "Twice-daily dosing supports adherence compared with brimonidine TID" }
    ]
},
lightgreen: {
    name: "α-2 + CAI Combo",
    desc: "Light-green cap. Timolol-free fixed combo.",
    drops: [
        { generic: "Brinzolamide + Brimonidine", brand: "Simbrinza", class: "CAI + α-2 agonist", concentration: "1 % + 0.2 %", adult_dose: "TID", moa: "↓ aqueous + ↑ uveoscleral", ocular_side_effects: "Blur (susp), allergy, bitter taste", systemic_side_effects: "Minimal", cautions_contraindications: "Sulfa allergy, age < 2 yr", storage_vehicle: "Shake; BAK 0.003 %", pearls: "Only U.S. fixed combination without β-blocker; reported mean IOP decrease ≈ 33 %" }
    ]
},
orange: {
    name: "Carbonic-Anhydrase Inhibitors",
    desc: "Orange cap. Topical CAIs.",
    drops: [
        { generic: "Dorzolamide", brand: "Trusopt", class: "Topical CAI", concentration: "2 %", adult_dose: "TID (BID if combo)", moa: "↓ aqueous production", ocular_side_effects: "Sting, SPK, bitter taste", systemic_side_effects: "Rare sulfa reaction", cautions_contraindications: "Sulfa allergy, severe renal/hepatic disease", storage_vehicle: "RT; BAK 0.0075 %", pearls: "Metallic taste common via nasolacrimal drainage; often selected when β-blockers contraindicated" },
        { generic: "Brinzolamide", brand: "Azopt", class: "Topical CAI", concentration: "1 % suspension", adult_dose: "TID", moa: "↓ aqueous production", ocular_side_effects: "Less sting vs dorzolamide, transient blur", systemic_side_effects: "Minimal", cautions_contraindications: "Sulfa allergy", storage_vehicle: "Shake; BAK 0.01 %", pearls: "Suspension formulation yields improved comfort with comparable efficacy; requires shaking before instillation" }
    ]
},
purple: {
    name: "α-2 Adrenergic Agonists",
    desc: "Purple cap. ↓ aqueous & ↑ uveoscleral.",
    drops: [
        { generic: "Brimonidine", brand: "Alphagan P 0.1 / 0.15 %", class: "α-2 agonist", concentration: "0.1 / 0.15 / 0.2 %", adult_dose: "TID", moa: "↓ aqueous & ↑ uveoscleral", ocular_side_effects: "Allergic follicular conjunctivitis (~20 %)", systemic_side_effects: "Dry-mouth, fatigue", cautions_contraindications: "MAO-I, infants < 2 yr", storage_vehicle: "RT; Purite (low-BAK)", pearls: "Purite-preserved formulation shows ~41 % lower allergy rate than 0.2 % BAK product; induces physiologic miosis that can reduce night glare; contraindicated in children < 2 yr due to apnea risk" },
        { generic: "Apraclonidine", brand: "Iopidine 1 %", class: "α-2 agonist", concentration: "0.5 % (chronic) / 1 % (peri-laser)", adult_dose: "TID (short-term)", moa: "↓ aqueous", ocular_side_effects: "Rapid tachyphylaxis, allergy", systemic_side_effects: "Dry-mouth", cautions_contraindications: "Same as class", storage_vehicle: "RT; BAK 0.01 %", pearls: "0.5 % concentration reverses anisocoria in Horner syndrome via denervation hypersensitivity; 1 % formulation reduces immediate post-laser IOP elevation; tachyphylaxis limits long-term therapy" }
    ]
},
darkgreen: {
    name: "Miotics",
    desc: "Dark-green cap. Cholinergic agents.",
    drops: [
        { generic: "Pilocarpine", brand: "Isopto Carpine", class: "Direct cholinergic", concentration: "1,2,4 %", adult_dose: "QID (acute ACG q15–60 min)", moa: "↑ TM out-flow via ciliary-m contraction", ocular_side_effects: "Brow ache, miosis, RD risk", systemic_side_effects: "Sweat, salivation (rare topical)", cautions_contraindications: "RD history, uveitis", storage_vehicle: "RT; BAK 0.01 %", pearls: "0.125 % diluted solution produces hypersensitivity in Adie pupil; 4 % or higher concentrations lower IOP during acute angle-closure; miosis may degrade night vision" }
    ]
},
red: {
    name: "Mydriatics / Cycloplegics",
    desc: "Red cap.",
    drops: [
        { generic: "Phenylephrine", brand: "Neo-Synephrine", class: "α-1 agonist", concentration: "2.5 / 10 %", adult_dose: "PRN; repeat q15 min × 2", moa: "Stimulates dilator muscle", ocular_side_effects: "Sting, rebound miosis", systemic_side_effects: "Hypertension, arrhythmia (10 %)", cautions_contraindications: "Severe HTN, infants", storage_vehicle: "RT; BAK 0.01 %", pearls: "2.5 % concentration blanches episcleritis but not scleritis; systemic hypertension more frequent with 10 % strength" },
        { generic: "Tropicamide", brand: "Mydriacyl", class: "Antimuscarinic", concentration: "0.5 / 1 %", adult_dose: "1–2 gtt pre-exam", moa: "Blocks sphincter/ciliary muscle", ocular_side_effects: "Photophobia, blur", systemic_side_effects: "Minimal", cautions_contraindications: "Very narrow angles", storage_vehicle: "RT; BAK 0.01 %", pearls: "Onset of mydriasis ≈ 20 min; duration 4–6 h; provides minimal cycloplegia in adults" },
        { generic: "Cyclopentolate", brand: "Cyclogyl", class: "Antimuscarinic", concentration: "0.5 / 1 / 2 %", adult_dose: "q5 min × 2", moa: "Same as tropicamide", ocular_side_effects: "Same; ↑ dry eye", systemic_side_effects: "CNS toxicity in children", cautions_contraindications: "Infants LBW—use 0.5 %", storage_vehicle: "RT; BAK 0.01 %", pearls: "Produces sustained cycloplegia for up to 24 h enabling accurate pediatric refraction; relaxes accommodative spasm" },
        { generic: "Atropine", brand: "Isopto Atropine", class: "Strong antimuscarinic", concentration: "0.01 % (low) / 1 %", adult_dose: "QD (bedtime) myopia control; BID uveitis", moa: "Same", ocular_side_effects: "Photophobia ≥ 7 d, angle-closure risk", systemic_side_effects: "Anticholinergic toxicity if overdosed", cautions_contraindications: "Down syndrome, narrow angles", storage_vehicle: "RT; BAK 0.01 %", pearls: "Randomized trials show 0.01 % slows myopia progression; 1 % historically used for pharmacologic penalization in amblyopia; abrupt cessation after prolonged therapy can cause rebound myopia" }
    ]
},
pink: {
    name: "Steroids",
    desc: "Pink cap.",
    drops: [
        { generic: "Prednisolone acetate", brand: "Pred Forte 1 %", class: "Corticosteroid", concentration: "1 % suspension", adult_dose: "q1–2 h pulse → taper", moa: "Phospholipase-A2 inhibition", ocular_side_effects: "IOP spike ≈ 30 %, PSC cataract", systemic_side_effects: "Minimal topical", cautions_contraindications: "Fungal keratitis, HSV dendrite", storage_vehicle: "Shake; BAK 0.006 % (brand) – many generics 0.01 %", pearls: "Requires vigorous shaking to resuspend drug; benchmark potency for intra-ocular inflammation; IOP rise commonly detectable within 2 weeks" },
        { generic: "Difluprednate", brand: "Durezol 0.05 %", class: "Very-potent steroid", concentration: "0.05 % emulsion", adult_dose: "QID (q6 h)", moa: "Same", ocular_side_effects: "High IOP-spike risk", systemic_side_effects: "Minimal", cautions_contraindications: "Same", storage_vehicle: "RT; no shaking", pearls: "Approximately double the anti-inflammatory potency of prednisolone acetate; supplied as emulsion that does not require shaking; IOP elevation can occur within 10 days" },
        { generic: "Loteprednol", brand: "Lotemax 0.5 % / Eysuvis 0.25 %", class: "“Soft” steroid", concentration: "0.25 / 0.38 / 0.5 %", adult_dose: "QID (pulse) or QID × 2 wk dry eye", moa: "Rapidly metabolized C-20 ester (soft-steroid)", ocular_side_effects: "Low IOP risk", systemic_side_effects: "Minimal", cautions_contraindications: "HSV caution", storage_vehicle: "Gel, susp, PF", pearls: "Metabolism to inactive metabolites results in lower IOP elevation risk; Eysuvis 0.25 % carries FDA indication for short-term dry-eye flares" },
        { generic: "Fluorometholone", brand: "FML 0.1 %", class: "Mild corticosteroid", concentration: "0.1 % suspension", adult_dose: "BID–QID", moa: "Same", ocular_side_effects: "Lower IOP spike vs pred", systemic_side_effects: "Minimal", cautions_contraindications: "HSV keratitis", storage_vehicle: "Shake; BAK 0.004 %", pearls: "Lower ocular penetration yields reduced IOP rise, making it suitable for superficial keratitis or allergic conjunctivitis; extended courses > 2 weeks linked to increased cataract risk" }
    ]
},
gray: {
    name: "NSAIDs",
    desc: "Gray cap.",
    drops: [
        { generic: "Ketorolac", brand: "Acular 0.5 % / Acuvail 0.45 % PF", class: "NSAID", concentration: "0.5 % QID / 0.45 % BID", adult_dose: "Per label", moa: "COX inhibition", ocular_side_effects: "Burn, rare corneal melt", systemic_side_effects: "Minimal", cautions_contraindications: "Corneal epithelial defects", storage_vehicle: "Acuvail PF single-use", pearls: "Inhibits prostaglandin-mediated miosis during surgery; frequently administered after LASIK or cataract; Acuvail preservative-free formulation demonstrates improved comfort" },
        { generic: "Bromfenac", brand: "Prolensa 0.07 %", class: "NSAID", concentration: "0.07 % QD", adult_dose: "QD", moa: "COX-2 > COX-1", ocular_side_effects: "Burning", systemic_side_effects: "Minimal", cautions_contraindications: "Sulfite allergy (contains sodium sulfite)", storage_vehicle: "RT; BAK 0.005 %", pearls: "Once-daily dosing supports adherence; clinical studies show efficacy in prevention and treatment of postoperative cystoid macular edema" },
        { generic: "Nepafenac", brand: "Ilevro 0.3 %", class: "NSAID pro-drug", concentration: "0.1 % TID / 0.3 % QD", adult_dose: "QD (0.3 %)", moa: "Pro-drug → amfenac in AC", ocular_side_effects: "Burn, irritation", systemic_side_effects: "Minimal", cautions_contraindications: "Class-wide", storage_vehicle: "RT; BAK 0.005 %", pearls: "High intraocular concentration via pro-drug conversion; randomized trials document benefit in diabetic eyes at risk for CME" },
        { generic: "Diclofenac", brand: "Voltaren 0.1 %", class: "NSAID", concentration: "0.1 % QID", adult_dose: "QID", moa: "COX inhibition", ocular_side_effects: "Burn, rare melt", systemic_side_effects: "Minimal", cautions_contraindications: "Active epithelial defect", storage_vehicle: "RT; sorbic acid 0.2 %", pearls: "Low acquisition cost; case reports link drug to corneal melts on compromised epithelium" }
    ]
},
tan: {
    name: "Antibiotics",
    desc: "Tan cap.",
    drops: [
        { generic: "Moxifloxacin", brand: "Vigamox 0.5 % (TID) / Moxeza 0.5 % (BID)", class: "4th-gen FQ", concentration: "0.5 %", adult_dose: "TID / BID", moa: "DNA gyrase & topo IV inhibition", ocular_side_effects: "Burn", systemic_side_effects: "Minimal", cautions_contraindications: "None", storage_vehicle: "PF (Vigamox)", pearls: "Self-preserved formulation; broad Gram-positive and Gram-negative coverage including atypical organisms; AAO notes suitability as monotherapy for bacterial keratitis pending cultures" },
        { generic: "Besifloxacin", brand: "Besivance 0.6 %", class: "4th-gen FQ", concentration: "0.6 %", adult_dose: "TID", moa: "Same", ocular_side_effects: "Blur (DuraSite vehicle)", systemic_side_effects: "Minimal", cautions_contraindications: "None", storage_vehicle: "DuraSite; BAK 0.01 %", pearls: "Displays highest in-vitro potency against MRSA/MRSE among ophthalmic FQs; viscous DuraSite vehicle prolongs ocular contact time" },
        { generic: "Gatifloxacin", brand: "Zymaxid 0.5 %", class: "4th-gen FQ", concentration: "0.5 %", adult_dose: "Day 1: q2 h × 8 (awake); Days 2–7: BID-QID", moa: "DNA gyrase & topo IV inhibition", ocular_side_effects: "Irritation, bitter taste", systemic_side_effects: "Minimal", cautions_contraindications: "None", storage_vehicle: "RT; BAK 0.005 %", pearls: "FDA-approved 7-day regimen; strong activity against streptococci and Pseudomonas" },
        { generic: "Tobramycin", brand: "Tobrex 0.3 %", class: "Aminoglycoside", concentration: "0.3 %", adult_dose: "Q4 h (severe q1 h)", moa: "30S ribosomal inhibition", ocular_side_effects: "Sting", systemic_side_effects: "Minimal", cautions_contraindications: "Aminoglycoside allergy", storage_vehicle: "RT; BAK 0.01 %", pearls: "Effective against Pseudomonas species common in contact-lens keratitis; frequently compounded with cefazolin for fortified corneal-ulcer therapy" },
        { generic: "Polytrim", brand: "Polymyxin B/Trimethoprim", class: "Combo bactericidal", concentration: "10 k U + 1 mg mL", adult_dose: "q3 h", moa: "Cell membrane + folate pathway", ocular_side_effects: "Allergy, lid edema", systemic_side_effects: "Minimal", cautions_contraindications: "Hypersensitivity to any component", storage_vehicle: "RT; BAK 0.004 %", pearls: "High susceptibility rates reported for *Haemophilus influenzae* isolates; widely used in acute bacterial conjunctivitis of childhood" }
    ]
},
black: {
    name: "Ointments",
    desc: "Black/stripe cap. Antibiotic ointments.",
    drops: [
        { generic: "Erythromycin", brand: "Ilotycin 0.5 % ung", class: "Macrolide", concentration: "0.5 %", adult_dose: "½-inch ribbon QHS/QID", moa: "50S ribosome inhibition", ocular_side_effects: "Blur, greasy lids", systemic_side_effects: "Minimal", cautions_contraindications: "None", storage_vehicle: "Petrolatum base", pearls: "Considered safe in pregnancy and neonates; applied for prophylaxis of ophthalmia neonatorum; ointment base supplies lubrication for lagophthalmos" }
    ]
},
"white-nocap": {
    name: "Miscellaneous (No-Cap)",
    desc: "Clear or office-only drops.",
    drops: [
        { generic: "Proparacaine", brand: "Generic", class: "Topical anesthetic", concentration: "0.5 %", adult_dose: "Clinic use only", moa: "Na⁺-channel blockade", ocular_side_effects: "Epitheliotoxic if abused", systemic_side_effects: "Rare CNS depression", cautions_contraindications: "Do NOT dispense", storage_vehicle: "Fridge 2–8 °C; BAK 0.01 %", pearls: "Repeated unsupervised application associated with persistent epithelial defects; corneal anesthesia lasts approximately 10–15 min" },
        { generic: "Ganciclovir", brand: "Zirgan 0.15 % gel", class: "Antiviral", concentration: "0.15 %", adult_dose: "5×/day till ulcer heals → TID × 7 d", moa: "Viral DNA-polymerase inhibition", ocular_side_effects: "Blur from gel", systemic_side_effects: "Minimal", cautions_contraindications: "None", storage_vehicle: "RT; PF", pearls: "Randomized trials show efficacy comparable to trifluridine for dendritic HSV with lower epithelial toxicity; standard course extends seven days beyond epithelial healing" },
        { generic: "Cyclosporine", brand: "Restasis 0.05 % / Cequa 0.09 %", class: "Calcineurin inhibitor", concentration: "0.05 / 0.09 %", adult_dose: "BID", moa: "↓ T-cell cytokines", ocular_side_effects: "Transient burning", systemic_side_effects: "Minimal", cautions_contraindications: "Active ocular infection", storage_vehicle: "PF single-use (Cequa) / multi-dose (Restasis)", pearls: "Clinical improvement in tear production and symptoms typically observed after 3–4 months; Cequa 0.09 % delivers higher drug concentration and earlier onset than 0.05 %" }
    ]
}

};

// Modal logic
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const modalTitle = document.getElementById('modalTitle');
const modalCategoryDesc = document.getElementById('modalCategoryDesc');
const dropList = document.getElementById('dropList');
// Quiz Mode logic
const quizModal = document.getElementById('quizModal');
const quizModalClose = document.getElementById('quizModalClose');
const quizModeBtn = document.getElementById('quizModeBtn');
const quizCard = document.getElementById('quizCard');
const quizShowAnswer = document.getElementById('quizShowAnswer');
const quizFeedback = document.getElementById('quizFeedback');
const quizNext = document.getElementById('quizNext');
const quizExit = document.getElementById('quizExit');

let currentQuiz = null;
let quizAnswered = false;
const quizTypes = [
    // Drop name → color
    {
        question: drop => `What color cap is used for <b>${drop.generic}</b>?`,
        answer: (drop, catKey) => catKey,
        answerType: 'color',
        show: drop => true
    },
    // Drop name → class
    {
        question: drop => `What is the drug class of <b>${drop.generic}</b>?`,
        answer: drop => drop.class,
        answerType: 'class',
        show: drop => true
    },
    // Drop name → side effect
    {
        question: drop => `Name a common ocular side effect of <b>${drop.generic}</b>.`,
        answer: drop => drop.ocular_side_effects,
        answerType: 'side_effect',
        show: drop => !!drop.ocular_side_effects
    },
    // Drop name → pearls
    {
        question: drop => `Give a clinical pearl for <b>${drop.generic}</b>.`,
        answer: drop => drop.pearls,
        answerType: 'pearls',
        show: drop => !!drop.pearls
    },
    // Drop name → concentration
    {
        question: drop => `What is the concentration of <b>${drop.generic}</b>?`,
        answer: drop => drop.concentration,
        answerType: 'concentration',
        show: drop => !!drop.concentration
    },
    // Color → class
    {
        question: (drop, catKey, cat) => `What is the drug class for the <b>${cat.name}</b> (${catKey}) cap?`,
        answer: (drop, catKey, cat) => cat.desc,
        answerType: 'class',
        show: (drop, catKey, cat) => !!cat.desc
    },
    // Color → drop name
    {
        question: (drop, catKey, cat) => `Name a drop in the <b>${cat.name}</b> (${catKey}) cap group.`,
        answer: (drop, catKey, cat) => drop.generic,
        answerType: 'drop',
        show: (drop, catKey, cat) => true
    }
];

function getRandomQuiz() {
    // Flatten all drops with their category
    const allDrops = [];
    Object.entries(dropData).forEach(([catKey, cat]) => {
        cat.drops.forEach(drop => {
            allDrops.push({ drop, catKey, cat });
        });
    });
    // Pick a random quiz type
    let quizType = quizTypes[Math.floor(Math.random() * quizTypes.length)];
    // Filter drops that work for this quiz type
    let validDrops = allDrops.filter(({ drop, catKey, cat }) => quizType.show(drop, catKey, cat));
    if (validDrops.length === 0) quizType = quizTypes[0];
    const { drop, catKey, cat } = validDrops[Math.floor(Math.random() * validDrops.length)];
    let question = quizType.question(drop, catKey, cat);
    let answer = quizType.answer(drop, catKey, cat);
    return { question, answer, drop, catKey, cat, quizType };
}

function showQuizCard() {
    currentQuiz = getRandomQuiz();
    quizCard.innerHTML = currentQuiz.question;
    quizFeedback.style.display = 'none';
    quizFeedback.textContent = '';
    quizShowAnswer.style.display = 'block';
    quizNext.style.display = 'none';
    quizAnswered = false;
}

quizModeBtn.addEventListener('click', () => {
    quizModal.style.display = 'flex';
    showQuizCard();
});

quizModalClose.addEventListener('click', () => {
    quizModal.style.display = 'none';
});
quizExit.addEventListener('click', () => {
    quizModal.style.display = 'none';
});

// Removed broken quizSubmit event handler and stray closing bracket

quizNext.addEventListener('click', () => {
    showQuizCard();
});

function showModal(categoryKey) {
    const cat = dropData[categoryKey];
    if (!cat) return;
    modalTitle.textContent = cat.name;
    modalCategoryDesc.textContent = cat.desc;
    dropList.innerHTML = '';
    cat.drops.forEach(drop => {
        const div = document.createElement('div');
        div.className = 'drop-item';
        div.innerHTML = `<div class='drop-title'>${drop.generic} <span style='color:#888;font-weight:400;'>(${drop.brand})</span></div>
            <div class='drop-attr'><strong>Class:</strong> ${drop.class}</div>
            <div class='drop-attr'><strong>Concentration:</strong> ${drop.concentration}</div>
            <div class='drop-attr'><strong>Dose:</strong> ${drop.adult_dose}</div>
            <div class='drop-attr'><strong>MOA:</strong> ${drop.moa}</div>
            <div class='drop-attr'><strong>Ocular Side Effects:</strong> ${drop.ocular_side_effects}</div>
            <div class='drop-attr'><strong>Systemic Side Effects:</strong> ${drop.systemic_side_effects}</div>
            <div class='drop-attr'><strong>Cautions/Contraindications:</strong> ${drop.cautions_contraindications}</div>
            <div class='drop-attr'><strong>Storage/Vehicle:</strong> ${drop.storage_vehicle}</div>
            <div class='drop-attr'><strong>Pearls:</strong> ${drop.pearls}</div>`;
        dropList.appendChild(div);
    });
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scroll
}

// Attach click listeners
window.addEventListener('DOMContentLoaded', () => {
    function getColorBox(catKey) {
        // Map category key to cap class and readable name
        const capClass = `dropcap-category dropcap-${catKey}`;
        let label = catKey.replace(/-/g, ' ');
        if (catKey === 'white-nocap') label = 'White (No Cap)';
        if (catKey === 'darkblue') label = 'Dark Blue';
        if (catKey === 'lightblue') label = 'Light Blue';
        if (catKey === 'lightgreen') label = 'Light Green';
        if (catKey === 'darkgreen') label = 'Dark Green';
        if (catKey === 'black') label = 'Black/Stripe';
        return `<div class='${capClass}' style='width:110px;height:50px;display:flex;align-items:center;justify-content:center;margin:0 auto 0.5em auto;font-size:1.08em;border-radius:10px;box-shadow:0 0 6px rgba(0,0,0,0.10);'>${label.charAt(0).toUpperCase() + label.slice(1)}</div>`;
    }
    document.querySelectorAll('.dropcap-category').forEach(el => {
        el.addEventListener('click', () => {
            showModal(el.getAttribute('data-category'));
        });
    });
    modalClose.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });

    // Quiz Mode event listeners
    quizModeBtn.addEventListener('click', () => {
        quizModal.style.display = 'flex';
        showQuizCard();
    });
    quizModalClose.addEventListener('click', () => {
        quizModal.style.display = 'none';
    });
    quizExit.addEventListener('click', () => {
        quizModal.style.display = 'none';
    });
    quizShowAnswer.addEventListener('click', () => {
        if (quizAnswered) return;
        // If question type is color, show colored box
        if (currentQuiz.quizType.answerType === 'color') {
            quizFeedback.innerHTML = getColorBox(currentQuiz.answer);
        } else {
            quizFeedback.innerHTML = `<span style='color:#008080;font-weight:600;'>${currentQuiz.answer}</span>`;
        }
        quizFeedback.style.display = 'block';
        quizShowAnswer.style.display = 'none';
        quizNext.style.display = 'block';
        quizAnswered = true;
    });
    quizNext.addEventListener('click', () => {
        showQuizCard();
    });
});
