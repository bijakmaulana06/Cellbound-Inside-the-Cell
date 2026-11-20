// CELLBOUND - karakter pemain 3D (FBX Cellcy & MMD .pmx/.pmd + rig animasi full-body)
// Dipakai di in-game (Zona 1): memuat karakter bawaan Cellcy (FBX) atau karakter MMD
// dari direktori public/models/mmd/ melalui menu Pilih Karakter.
(() => {
    const DEFAULT_CHAR = {
        id: 'cellcy-default',
        name: 'Cellcy',
        subtitle: 'Karakter Bawaan · FBX Rig',
        type: 'fbx',
        format: 'FBX',
        url: 'models/cellcy_full_rigged.fbx',
        parts: ['models/cellcy_full_rigged.fbx.part0', 'models/cellcy_full_rigged.fbx.part1'],
        builtin: true
    };
    const STORAGE_KEY = 'cellbound_char_id';
    const TARGET_H = 5.1, HEAD = TARGET_H;
    const X = new T.Vector3(1, 0, 0), Y = new T.Vector3(0, 1, 0), Z = new T.Vector3(0, 0, 1);
    const _q1 = new T.Quaternion(), _q2 = new T.Quaternion(), _q3 = new T.Quaternion();
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    let ready = false, tpl = null, rig = null, mmdExtra = null;
    let charCatalog = [DEFAULT_CHAR];
    let activeChar = DEFAULT_CHAR, loadedChar = DEFAULT_CHAR;
    let loadSeq = 0;

    // P (posisi) -> actor (arah hadap) -> lean (condong & banking) -> body (bounce, squash-stretch + model)
    const actor = new T.Group(), lean = new T.Group(), body = new T.Group();
    actor.add(lean); lean.add(body); P.add(actor);

    // ---------- aura ganda + piringan glow + bayangan kontak ----------
    const aura = new T.Mesh(
        new T.TorusGeometry(1.38, .055, 10, 56),
        new T.MeshBasicMaterial({ color: 0x4ff0d0, transparent: true, opacity: .55, depthWrite: false, blending: T.AdditiveBlending })
    );
    aura.rotation.x = -Math.PI / 2; aura.position.y = .07; aura.renderOrder = 2; P.add(aura);

    const auraOuter = new T.Mesh(
        new T.RingGeometry(1.52, 1.62, 48, 1, 0, Math.PI * 1.35),
        new T.MeshBasicMaterial({ color: 0xb588ff, transparent: true, opacity: .38, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending })
    );
    auraOuter.rotation.x = -Math.PI / 2; auraOuter.position.y = .08; auraOuter.renderOrder = 2; P.add(auraOuter);

    const glowPad = (() => {
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 4, 64, 64, 62);
        r.addColorStop(0, 'rgba(79,240,208,.40)'); r.addColorStop(.5, 'rgba(140,110,255,.14)'); r.addColorStop(1, 'rgba(79,240,208,0)');
        g.fillStyle = r; g.fillRect(0, 0, 128, 128);
        const m = new T.Mesh(
            new T.PlaneGeometry(3.4, 3.4),
            new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: .72 })
        );
        m.rotation.x = -Math.PI / 2; m.position.y = .04; m.renderOrder = 1; return m;
    })(); P.add(glowPad);

    const sh = (() => {
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 4, 64, 64, 62);
        r.addColorStop(0, 'rgba(0,0,0,.62)'); r.addColorStop(.5, 'rgba(0,0,0,.3)'); r.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = r; g.fillRect(0, 0, 128, 128);
        const m = new T.Mesh(new T.PlaneGeometry(2.7, 2.2), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false, opacity: .92 }));
        m.rotation.x = -Math.PI / 2; m.position.y = .025; m.renderOrder = 1; return m;
    })(); P.add(sh);

    // partikel kunang-kunang bio-luminesen yang mengorbit karakter
    const MOTE_N = 18, moteG = new T.BufferGeometry(), moteP = new Float32Array(MOTE_N * 3), moteSeed = [];
    for (let i = 0; i < MOTE_N; i++) moteSeed.push({ a: i / MOTE_N * Math.PI * 2, r: 1.05 + Math.random() * .95, y: .5 + Math.random() * 3.8, sp: .6 + Math.random() * .9, ph: Math.random() * 6.28 });
    moteG.setAttribute('position', new T.BufferAttribute(moteP, 3));
    const motes = new T.Points(moteG, new T.PointsMaterial({ color: 0xa8fff4, size: .2, transparent: true, opacity: .68, blending: T.AdditiveBlending, depthWrite: false }));
    motes.renderOrder = 4; P.add(motes);

    // riak langkah (step ripples) di lantai sitoplasma
    const ripples = [], ripGeo = new T.RingGeometry(.32, .46, 28);
    function spawnRipple() {
        if (typeof S === 'undefined' || !S) return;
        const m = new T.Mesh(ripGeo, new T.MeshBasicMaterial({ color: aura.material.color.clone(), transparent: true, opacity: .52, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }));
        m.rotation.x = -Math.PI / 2; m.position.set(P.position.x, .05, P.position.z); m.renderOrder = 2;
        S.add(m); ripples.push({ m, age: 0 });
    }

    window.CHAR_HEAD = HEAD;

    // ---------- indikator memuat ----------
    const badge = document.createElement('div');
    badge.style.cssText = 'position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:20;pointer-events:none;background:rgba(6,30,44,.92);border:1px solid #1d5b70;border-radius:999px;padding:8px 16px;font:600 12px Sora,system-ui,sans-serif;color:#8fb7c4;display:none';
    document.body.appendChild(badge);
    const showBadge = txt => { badge.textContent = txt; badge.style.display = 'block'; };
    const hideBadge = () => { badge.style.display = 'none'; };

    // ---------- pemetaan rig 3-sumbu (MMD Jepang/Inggris, AccuRig, Mixamo) ----------
    // Pertahankan karakter Unicode/Jepang, hanya hapus spasi & tanda baca ASCII
    const norm = s => String(s || '').trim().replace(/[\s_\-.:/\\]+/g, '').toLowerCase();
    const findBone = (root, wants) => {
        const list = (Array.isArray(wants) ? wants : [wants]).map(norm);
        let exact = null, suffix = null;
        root.traverse(o => {
            if (!o.isBone) return;
            const n = norm(o.name);
            if (!n) return;
            if (!exact && list.includes(n)) exact = o;
            else if (!suffix && list.some(w => w.length >= 4 && n.endsWith(w))) suffix = o;
        });
        return exact || suffix;
    };

    const BONE_SPEC = [
        [['センター', '腰', '下半身', 'center', 'waist', 'pelvis', 'ccbasepelvis', 'hips'], 'hips'],
        [['上半身', 'upperbody', 'spine01', 'spine'], 'spine'],
        [['上半身2', 'upperbody2', 'spine02', 'spine1'], 'chest'],
        [['首', 'neck01', 'neck'], 'neck'],
        [['頭', 'head'], 'head'],
        [['左肩', 'leftshoulder', 'claviclel', 'shoulderl'], 'lclav'],
        [['右肩', 'rightshoulder', 'clavicler', 'shoulderr'], 'rclav'],
        [['左腕', 'leftarm', 'upperarml', 'arml'], 'larm', ['左ひじ', 'leftelbow', 'lowerarml', 'leftforearm', 'elbowl']],
        [['右腕', 'rightarm', 'upperarmr', 'armr'], 'rarm', ['右ひじ', 'rightelbow', 'lowerarmr', 'rightforearm', 'elbowr']],
        [['左ひじ', 'leftelbow', 'lowerarml', 'leftforearm', 'elbowl'], 'lfore'],
        [['右ひじ', 'rightelbow', 'lowerarmr', 'rightforearm', 'elbowr'], 'rfore'],
        [['左手首', 'leftwrist', 'handl', 'lefthand', 'wristl'], 'lhand'],
        [['右手首', 'rightwrist', 'handr', 'righthand', 'wristr'], 'rhand'],
        [['左足', 'leftleg', 'thighl', 'leftupleg', 'legl'], 'lup'],
        [['右足', 'rightleg', 'thighr', 'rightupleg', 'legr'], 'rup'],
        [['左ひざ', 'leftknee', 'calfl', 'kneel'], 'lknee'],
        [['右ひざ', 'rightknee', 'calfr', 'kneer'], 'rknee'],
        [['左足首', 'leftankle', 'footl', 'leftfoot', 'anklel'], 'lfoot'],
        [['右足首', 'rightankle', 'footr', 'rightfoot', 'ankler'], 'rfoot']
    ];

    function rigInfo(root, tmpl) {
        const base = {}; if (tmpl) for (const d of tmpl) base[d.key] = d;
        root.updateMatrixWorld(true);
        const mk = (want, key, tip) => {
            const b = findBone(root, want); if (!b) return null;
            if (base[key]) return {
                key, b, rest: base[key].rest.clone(),
                axisX: base[key].axisX.clone(), axisY: base[key].axisY.clone(), axisZ: base[key].axisZ.clone(),
                lower: base[key].lower
            };
            const q = new T.Quaternion(); b.getWorldQuaternion(q);
            const inv = q.clone().invert();
            const axisX = X.clone().applyQuaternion(inv).normalize();
            const axisY = Y.clone().applyQuaternion(inv).normalize();
            const axisZ = Z.clone().applyQuaternion(inv).normalize();
            let lower = 0; const tb = tip ? findBone(root, tip) : null;
            if (tb) {
                const sh = b.getWorldPosition(new T.Vector3()), el = tb.getWorldPosition(new T.Vector3());
                const d = el.sub(sh).normalize(), a = Math.atan2(d.y, d.x);
                let th = -Math.PI / 2 - a; th = Math.atan2(Math.sin(th), Math.cos(th));
                lower = clamp(th * .90, -1.45, 1.45);
            }
            return { key, b, rest: b.quaternion.clone(), axisX, axisY, axisZ, lower };
        };
        const list = BONE_SPEC.map(([a, k, t]) => mk(a, k, t)).filter(Boolean);
        const map = {}; for (const d of list) map[d.key] = d;
        // PENTING: Setelah lengan atas (larm/rarm) diturunkan dari pose-A/T sebesar `lower` mengelilingi sumbu Z,
        // sumbu engsel siku (lfore/rfore) ikut berputar sebesar `lower`!
        // Putar balik axisX siku sebesar `-lower` mengelilingi axisZ agar tekukan siku selalu murni ke DEPAN-ATAS (bukan miring ke samping).
        const fixElbowAxis = (armKey, foreKey) => {
            const arm = map[armKey], fore = map[foreKey];
            if (!arm || !fore || !arm.lower) return;
            const qFix = new T.Quaternion().setFromAxisAngle(fore.axisZ, -arm.lower);
            fore.axisX.applyQuaternion(qFix).normalize();
            fore.axisY.applyQuaternion(qFix).normalize();
        };
        fixElbowAxis('larm', 'lfore');
        fixElbowAxis('rarm', 'rfore');
        list.byKey = map;
        return list;
    }

    // ---------- fisika pegas 2nd-order khusus bone dada (L_ChestBone01, R_ChestBone01, 左胸/右胸) ----------
    // Menggunakan osilator pegas-redaman langsung pada sumbu dunia (pitch naik-turun X & sway kiri-kanan Y/Z)
    // karena bone dada MMD umumnya berarah ke bawah (-Y) sehingga pendulum Verlet tidak menangkap pantulan vertikal!
    function setupChestSprings(mesh) {
        if (!mesh || !mesh.skeleton) return null;
        mesh.updateMatrixWorld(true);
        const meshQ = mesh.getWorldQuaternion(new T.Quaternion());
        const invMeshQ = meshQ.clone().invert();
        const bones = mesh.skeleton.bones;
        const mmd = mesh.geometry && mesh.geometry.userData && mesh.geometry.userData.MMD;
        const dynSet = new Set();
        if (mmd && mmd.rigidBodies) {
            for (const rb of mmd.rigidBodies) {
                if ((rb.type === 1 || rb.type === 2) && rb.boneIndex >= 0 && rb.boneIndex < bones.length) {
                    dynSet.add(bones[rb.boneIndex]);
                }
            }
        }
        // hitung bobot skinning agar bone dada yang benar-benar menggerakkan mesh (mis. L_ChestBone01/R_ChestBone01) terdeteksi pasti
        const wSum = new Float32Array(bones.length);
        const si = mesh.geometry && mesh.geometry.attributes && mesh.geometry.attributes.skinIndex;
        const sw = mesh.geometry && mesh.geometry.attributes && mesh.geometry.attributes.skinWeight;
        if (si && sw) {
            for (let i = 0; i < sw.array.length; i++) {
                const bi = si.array[i], w = sw.array[i];
                if (bi >= 0 && bi < wSum.length && w > .01) wSum[bi] += w;
            }
        }

        const items = [];
        const boneSet = new Set();
        const grantChildren = new Set();
        const maxGrantRatio = new Map();
        if (mmd && mmd.grants) {
            for (const g of mmd.grants) {
                const gb = bones[g.index], pb = bones[g.parentIndex];
                if (gb && pb && /^(?:[lr]_?chest|左胸|右胸|breast|oppai|おっぱい)/i.test(pb.name)) {
                    grantChildren.add(gb);
                    const r = Math.abs(g.ratio || 0);
                    if (r > (maxGrantRatio.get(pb) || 0)) maxGrantRatio.set(pb, r);
                }
            }
        }
        for (let i = 0; i < bones.length; i++) {
            const b = bones[i];
            const name = String(b.name || '');
            // cocokkan bone dada (kiri/kanan), hindari bone dekorasi kecil / pengatur / ujung / bone yg sudah ikut grant
            if (!/^(?:[lr]_?chest|左胸|右胸|breast|oppai|おっぱい)/i.test(name)) continue;
            if (/先|調整|変形|飾|饰|root|end/i.test(name)) continue;
            if (grantChildren.has(b)) continue;
            if (!dynSet.has(b) && wSum[i] < 10 && !maxGrantRatio.has(b)) continue;

            const qW = b.getWorldQuaternion(new T.Quaternion());
            const qLocalModel = invMeshQ.clone().multiply(qW);
            const invQ = qLocalModel.clone().invert();
            const axisX = X.clone().applyQuaternion(invQ).normalize();
            const axisY = Y.clone().applyQuaternion(invQ).normalize();
            const axisZ = Z.clone().applyQuaternion(invQ).normalize();
            const side = (/^(?:l_|左)/i.test(name) || b.getWorldPosition(new T.Vector3()).applyMatrix4(mesh.matrixWorld.clone().invert()).x > 0) ? 1 : -1;
            const isSub = boneSet.has(b.parent);
            // jika bone dada ini hanya penggerak Grant (skinW==0, ratio ~0.5 seperti Iuno 左胸 -> 左胸1),
            // kompensasi gainnya agar amplitudo mesh akhir setara dengan model yang skinning langsung (Changli)
            const gRatio = (wSum[i] < 1 && maxGrantRatio.has(b)) ? clamp(maxGrantRatio.get(b), .45, 1) : 1;
            items.push({
                b, side, isSub, gain: 1 / gRatio, rest: b.quaternion.clone(), axisX, axisY, axisZ,
                py: 0, vy: 0, px: 0, vx: 0
            });
            boneSet.add(b);
        }
        if (!items.length) return null;
        return { items, boneSet, prevY: 0, prevVy: 0, prevSpeed: 0, prevYaw: 0, inited: false };
    }

    function updateChestSprings(cs, dt, t, speed, phase, move, turnRate, bodyY, actorYaw) {
        if (!cs || !cs.items.length) return;
        const step = Math.min(dt, .033);
        if (!cs.inited) {
            cs.prevY = bodyY; cs.prevVy = 0; cs.prevSpeed = speed; cs.prevYaw = actorYaw; cs.inited = true;
            return;
        }
        // hitung percepatan vertikal (langkah/lompat), percepatan maju-mundur (start/stop), dan percepatan belok
        const curVy = (bodyY - cs.prevY) / Math.max(step, .004);
        const accY = clamp((curVy - cs.prevVy) / Math.max(step, .008), -45, 45);
        const accFwd = clamp((speed - cs.prevSpeed) / Math.max(step, .008), -30, 30);
        let dYaw = actorYaw - cs.prevYaw;
        dYaw = ((dYaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        const yawVel = clamp(dYaw / Math.max(step, .008), -12, 12);

        cs.prevY = bodyY;
        cs.prevVy = curVy;
        cs.prevSpeed = speed;
        cs.prevYaw = actorYaw;

        // dorongan ritmis tiap langkah kaki: saat kaki menapak & turun (phase=π/4, sin2=+1), badan terdorong balik ke atas (accY>0)
        // sehingga inersia dada melesak ke bawah (+pitchX) — +accY dan +sin(2*phase) sefase & saling menguatkan!
        const stepBounce = Math.sin(phase * 2) * 12 * move;
        const breath = Math.sin(t * 2.1) * .028 * (1 - move * .5);

        const kSpring = 92;   // kekakuan pegas (frekuensi ~1.53 Hz — empuk & natural)
        const cDamp = 6.8;    // redaman underdamped (2-3 pantulan lembut lalu reda mulus)

        for (let i = 0; i < cs.items.length; i++) {
            const it = cs.items[i];
            // komponen vertikal (naik-turun): bereaksi terhadap percepatan Y tubuh + hentakan langkah + start/stop
            const stepSide = Math.sin(phase) * it.side * 4.5 * move;
            const forceY = accY * .75 + stepBounce + stepSide - accFwd * .35;
            const ay = forceY - kSpring * it.py - cDamp * it.vy;
            it.vy += ay * step;
            it.py = clamp(it.py + it.vy * step, -.34, .34);

            // komponen horizontal (kiri-kanan): bereaksi terhadap belokan & counter-twist dada saat lari
            const twistForce = -yawVel * 3.2 - turnRate * 2.2 - Math.cos(phase) * 8.0 * move;
            const ax = twistForce - (kSpring * .85) * it.px - (cDamp * 1.05) * it.vx;
            it.vx += ax * step;
            it.px = clamp(it.px + it.vx * step, -.26, .26);

            // terapkan rotasi elastis langsung ke bone dada (sub-bone pakai 45%, grant-driver dikompensasi via it.gain)
            const mul = (it.isSub ? .45 : 1.0) * (it.gain || 1.0);
            const limP = .38 * (it.gain || 1.0);
            const limS = .26 * (it.gain || 1.0);
            const pitchX = clamp((it.py + breath) * mul, -limP, limP);
            const swayY = clamp(it.px * .75 * mul, -limS, limS);
            const rollZ = clamp((-it.px * .45 + it.py * it.side * .18) * mul, -limS * .85, limS * .85);

            it.b.quaternion.copy(it.rest);
            it.b.quaternion.multiply(_q1.setFromAxisAngle(it.axisX, pitchX));
            it.b.quaternion.multiply(_q2.setFromAxisAngle(it.axisY, swayY));
            it.b.quaternion.multiply(_q3.setFromAxisAngle(it.axisZ, rollZ));
        }
    }

    // ---------- fisika PBD / FABRIK Ribbon Spring-Bone untuk rambut & pakaian MMD ----------
    // Menggunakan rantai titik PBD (backward + forward pass 4 iterasi + collider kapsul outward-normal)
    // sehingga saat paha/lutut mengayun ke depan, seluruh helai rok dari pinggang sampai ujung ikut
    // terangkat mulus di LUAR kulit tubuh/kaki (anti-tembus & tetap smooth seperti MMD asli).
    const _vA = new T.Vector3(), _vB = new T.Vector3(), _vC = new T.Vector3(), _vD = new T.Vector3();
    const _vE = new T.Vector3(), _vF = new T.Vector3(), _vG = new T.Vector3(), _vH = new T.Vector3();
    const _qInv = new T.Quaternion(), _qRestW = new T.Quaternion(), _qDelta = new T.Quaternion(), _qTarget = new T.Quaternion();

    function setupMmdPhysics(mesh, posedSet) {
        const mmd = mesh && mesh.geometry && mesh.geometry.userData && mesh.geometry.userData.MMD;
        if (!mmd || !mmd.rigidBodies || !mmd.rigidBodies.length || !mesh.skeleton) return null;

        const bones = mesh.skeleton.bones;
        const rbs = mmd.rigidBodies;
        mesh.updateMatrixWorld(true);
        const meshScale = mesh.getWorldScale(new T.Vector3()).y || 1;
        const invMeshMat = mesh.matrixWorld.clone().invert();

        // 1. Kumpulkan collider kinematik (type === 0: kepala, badan, paha, lutut, lengan)
        // CATATAN PENTING: MMDLoader.GeometryBuilder SUDAH mengubah rb.position menjadi OFFSET relatif
        // dari posisi bone (dalam ruang model tak-berskala), bukan koordinat absolut model!
        const meshWorldQ = mesh.getWorldQuaternion(new T.Quaternion());
        const colliders = [];
        for (const rb of rbs) {
            if (rb.type !== 0 || rb.boneIndex < 0 || rb.boneIndex >= bones.length) continue;
            const bone = bones[rb.boneIndex];
            if (!bone) continue;
            const boneWorldQ = bone.getWorldQuaternion(new T.Quaternion());
            const modelToBoneQ = boneWorldQ.clone().invert().multiply(meshWorldQ);

            // rb.position adalah offset relatif dari bone dalam ruang model -> putar ke ruang lokal bone
            const localCenter = new T.Vector3().fromArray(rb.position || [0, 0, 0]).applyQuaternion(modelToBoneQ);

            let halfH = 0;
            const localAxis = new T.Vector3(0, 1, 0);
            if (rb.shapeType === 2 && rb.height > 0.001) {
                halfH = rb.height * .5;
                const eul = new T.Euler(rb.rotation[0] || 0, rb.rotation[1] || 0, rb.rotation[2] || 0, 'YXZ');
                const axisModel = new T.Vector3(0, 1, 0).applyEuler(eul).normalize();
                localAxis.copy(axisModel).applyQuaternion(modelToBoneQ).normalize();
            }
            const rawR = rb.shapeType === 1 ? Math.max(rb.width || .3, rb.depth || .3) * .85 : (rb.width || .35);
            const localA = localCenter.clone().addScaledVector(localAxis, halfH);
            const localB = localCenter.clone().addScaledVector(localAxis, -halfH);
            const worldA = localA.clone().applyMatrix4(bone.matrixWorld);
            const worldB = localB.clone().applyMatrix4(bone.matrixWorld);
            colliders.push({
                bone,
                groupBit: 1 << (rb.groupIndex || 0),
                localA,
                localB,
                radius: Math.max(.08, rawR) * meshScale,
                a: worldA,
                b: worldB,
                worldQ: boneWorldQ,
                invRestQ: boneWorldQ.clone().invert(),
                isLeg: /足|ひざ|膝|leg|thigh|knee|calf/i.test(String(rb.name || bone.name || ''))
            });
        }

        // 2. Kumpulkan bone dinamis (type === 1 atau 2)
        const dynByBone = new Map();
        for (const rb of rbs) {
            if ((rb.type !== 1 && rb.type !== 2) || rb.boneIndex < 0 || rb.boneIndex >= bones.length) continue;
            const bone = bones[rb.boneIndex];
            if (!bone || (posedSet && posedSet.has(bone))) continue;
            if (!dynByBone.has(bone)) dynByBone.set(bone, rb);
        }
        if (!dynByBone.size) return null;

        const depthOf = b => { let d = 0, p = b.parent; while (p && p.isBone) { d++; p = p.parent; } return d; };
        const sortedBones = [...dynByBone.keys()].sort((a, b) => depthOf(a) - depthOf(b));

        // 3. Kelompokkan bone dinamis menjadi rantai (chains) untuk PBD/FABRIK 2-arah
        const visited = new Set();
        const anchorMap = new Map();
        const chains = [];

        function buildColliderList(ptW, rb, worldLen, isChest) {
            const list = [];
            if (isChest || !colliders.length) return list;
            const hitR = clamp((rb.width || .14) * .55, .04, .24) * meshScale;
            const gTarget = rb.groupTarget !== undefined ? rb.groupTarget : 0xffff;
            for (const c of colliders) {
                if ((gTarget & c.groupBit) === 0) continue;
                const seg = c.b.clone().sub(c.a);
                const segSq = seg.lengthSq();
                const u = segSq > 1e-8 ? clamp(ptW.clone().sub(c.a).dot(seg) / segSq, 0, 1) : 0;
                const closest = c.a.clone().addScaledVector(seg, u);
                const outVec = ptW.clone().sub(closest);
                const restDist = outVec.length();
                const fullR = c.radius * (c.isLeg ? 1.12 : 1.0) + hitR;
                // jangkauan relevan saja agar tetap ringan 60fps
                if (restDist > fullR + worldLen * 3.5 + (c.isLeg ? .9 : .5)) continue;
                let outLocal = new T.Vector3(0, 0, 1);
                if (restDist > 1e-4) {
                    outLocal.copy(outVec).divideScalar(restDist).applyQuaternion(c.invRestQ).normalize();
                }
                // minR = restDist * 0.98 saat posisi rest memang lebih dekat dari fullR -> NOL dorongan/patah saat diam,
                // tapi langsung mendorong keluar begitu kaki/badan bergerak lebih dekat dari jarak rest!
                const minR = restDist < fullR ? restDist * .98 : fullR;
                // saat berjalan (speed > 0), tambah sedikit bantalan ekstra khusus collider kaki agar lutut/paha tak pernah menembus rok
                const movePad = c.isLeg ? (c.radius * .14) : 0;
                list.push({ c, minR, movePad, outLocal });
            }
            return list;
        }

        function traceChain(startBone) {
            const seq = [];
            let cur = startBone;
            while (cur && dynByBone.has(cur) && !visited.has(cur)) {
                visited.add(cur);
                seq.push(cur);
                const dynKids = cur.children.filter(c => c.isBone && dynByBone.has(c) && !visited.has(c) && c.position.lengthSq() > 1e-5);
                if (dynKids.length === 0) break;
                // lanjutkan rantai utama ke child pertama; jika ada cabang tambahan, trace sebagai rantai terpisah
                cur = dynKids[0];
                for (let k = 1; k < dynKids.length; k++) pendingRoots.push(dynKids[k]);
            }
            return seq;
        }

        const pendingRoots = sortedBones.filter(b => !dynByBone.has(b.parent));
        let chainIdx = 0;
        while (pendingRoots.length) {
            const rootBone = pendingRoots.shift();
            if (visited.has(rootBone)) continue;
            const seq = traceChain(rootBone);
            if (!seq.length) continue;

            const anchorBone = seq[0].parent;
            if (!anchorBone) continue;
            let anchor = anchorMap.get(anchorBone);
            if (!anchor) {
                anchor = { bone: anchorBone, q: new T.Quaternion() };
                anchorMap.set(anchorBone, anchor);
            }

            const chainLen = seq.length;
            const chainPhase = (chainIdx++ * 1.17) % 6.283;
            const nodes = [];
            const pts = []; // length = seq.length + 1

            // titik 0 = pangkal bone pertama (terjangkar pada anchorBone)
            const p0W = seq[0].getWorldPosition(new T.Vector3());
            pts.push({ pos: p0W.clone(), prev: p0W.clone(), rest: p0W.clone(), len: 0, cols: [] });

            for (let i = 0; i < seq.length; i++) {
                const bone = seq[i];
                const rb = dynByBone.get(bone);
                const nextBone = seq[i + 1] || null;
                let tipLocal = null;

                if (nextBone && nextBone.position.lengthSq() > 1e-5) {
                    tipLocal = nextBone.position.clone();
                } else {
                    const anyChild = bone.children.find(c => c.isBone && c.position.lengthSq() > 1e-5);
                    if (anyChild) {
                        tipLocal = anyChild.position.clone();
                    } else {
                        // rb.position sudah berupa offset dari bone dalam ruang model
                        const rbOff = new T.Vector3().fromArray(rb.position || [0, 0, 0]);
                        if (rbOff.lengthSq() > 1e-4) {
                            const bWorldQ = bone.getWorldQuaternion(new T.Quaternion());
                            tipLocal = rbOff.applyQuaternion(bWorldQ.invert().multiply(meshWorldQ));
                            if (tipLocal.length() < .25) tipLocal.setLength(Math.max(.35, rb.height || rb.width || .35));
                        } else if (bone.position.lengthSq() > 1e-4) {
                            tipLocal = bone.position.clone().setLength(Math.max(.35, rb.height || rb.width || .35));
                        } else {
                            tipLocal = new T.Vector3(0, -.4, 0);
                        }
                    }
                }

                const localLen = tipLocal.length();
                if (localLen < 1e-4) break;
                const localDir = tipLocal.clone().divideScalar(localLen);
                const worldLen = localLen * meshScale;
                const bName = String(bone.name || rb.name || '');
                const isChest = /胸|breast|chest|おっぱい|oppai|乳/i.test(bName);
                const pmxDamp = clamp(((rb.positionDamping ?? .7) + (rb.rotationDamping ?? .7)) * .5, .4, 1);

                const tipFrac = chainLen > 1 ? i / (chainLen - 1) : 1; // 0 di pangkal -> 1 di ujung
                const tipW = tipLocal.clone().applyMatrix4(bone.matrixWorld);
                pts.push({
                    pos: tipW.clone(),
                    prev: tipW.clone(),
                    rest: tipW.clone(),
                    len: worldLen,
                    isChest,
                    tipFrac,
                    // TRUE KawaiiPhysics (Unreal Engine / Wuthering Waves):
                    // Stiffness sangat lembut (0.045 di pangkal -> 0.008 di ujung) & Damping ringan (0.12 -> 0.06)
                    // sehingga rambut & kain benar-benar mengalir bebas mengikuti inersia, angin, dan belokan!
                    stiffness: isChest ? .26 : Math.max(.008, .048 - tipFrac * .040),
                    drag: isChest ? .20 : clamp(.13 - tipFrac * .065 + (pmxDamp - .7) * .02, .055, .15),
                    gravity: isChest ? .012 : (.035 + tipFrac * .025),
                    cols: buildColliderList(tipW, rb, worldLen, isChest)
                });

                nodes.push({
                    b: bone,
                    restQ: bone.quaternion.clone(),
                    localDir,
                    worldLen,
                    isChest,
                    maxAngle: isChest ? .28 : clamp(.98 / Math.sqrt(chainLen), .26, .56),
                    smoothRate: isChest ? 20 : 32
                });
            }

            if (nodes.length) {
                chains.push({ anchor, anchorBone, chainPhase, nodes, pts, isChildChain: dynByBone.has(anchorBone) });
            }
        }

        // urutkan agar rantai induk (anchor non-dinamis) selalu selesai sebelum rantai cabang
        chains.sort((a, b) => (a.isChildChain ? 1 : 0) - (b.isChildChain ? 1 : 0));

        const rootPos = mesh.getWorldPosition(new T.Vector3());
        return { mesh, chains, colliders, anchors: [...anchorMap.values()], meshScale, prevRootPos: rootPos, rootDelta: new T.Vector3() };
    }

    // dorong satu titik keluar dari daftar collider kapsul dengan arah outward-normal
    function resolvePointColliders(px, py, pz, cols, moveFactor, outVec) {
        let hit = false;
        let x = px, y = py, z = pz;
        for (let j = 0; j < cols.length; j++) {
            const pair = cols[j], c = pair.c;
            const minR = pair.minR + pair.movePad * moveFactor;
            const minRSq = minR * minR;
            const gx = c.b.x - c.a.x, gy = c.b.y - c.a.y, gz = c.b.z - c.a.z;
            const segSq = gx * gx + gy * gy + gz * gz;
            let u = 0;
            if (segSq > 1e-8) {
                u = clamp(((x - c.a.x) * gx + (y - c.a.y) * gy + (z - c.a.z) * gz) / segSq, 0, 1);
            }
            const cx = c.a.x + gx * u, cy = c.a.y + gy * u, cz = c.a.z + gz * u;
            const dx = x - cx, dy = y - cy, dz = z - cz;
            const dSq = dx * dx + dy * dy + dz * dz;
            if (dSq < minRSq) {
                _vH.copy(pair.outLocal).applyQuaternion(c.worldQ);
                const projOut = dx * _vH.x + dy * _vH.y + dz * _vH.z;
                if (projOut < minR * .35) {
                    const need = (minR - projOut) * 1.05;
                    x += _vH.x * need; y += _vH.y * need; z += _vH.z * need;
                } else {
                    const dist = Math.sqrt(Math.max(dSq, 1e-10));
                    const need = (minR - dist) / dist;
                    x += dx * need; y += dy * need; z += dz * need;
                }
                hit = true;
            }
        }
        outVec.set(x, y, z);
        return hit;
    }

    function updateMmdPhysics(phys, dt, t, speed) {
        if (!phys || !phys.chains.length) return;
        const step = Math.min(dt, .033);
        const dtScale = step * 60;

        // wariskan 80% translasi horizontal ke rambut/kain agar lari cepat tetap smooth,
        // tapi biarkan gerak VERTIKAL (bounce langkah & lompat) terasa nyata!
        // Khusus bone dada: pewarisan gerak lebih kecil supaya pantulan elastis saat jalan/belok/lompat terasa natural.
        phys.mesh.matrixWorld.decompose(_vA, _qRestW, _vB);
        phys.rootDelta.subVectors(_vA, phys.prevRootPos);
        phys.prevRootPos.copy(_vA);
        const teleported = phys.rootDelta.lengthSq() > 4;
        // KawaiiPhysics WorldDampingLocation rendah (0.35 pangkal -> 0.12 ujung) agar 65%-88% gerak lari
        // menciptakan aliran inersia rambut & kain yang nyata ke belakang (seperti Wuthering Waves)!
        const carryXZ = teleported ? 1.0 : .36;
        const carryY = teleported ? 1.0 : .18;
        const chestCarryXZ = teleported ? 1.0 : .55;
        const chestCarryY = teleported ? 1.0 : .0;
        const dxRoot = phys.rootDelta.x, dyRoot = phys.rootDelta.y, dzRoot = phys.rootDelta.z;

        // update rotasi dunia collider kinematik
        const cols = phys.colliders;
        for (let i = 0; i < cols.length; i++) {
            const c = cols[i];
            c.a.copy(c.localA).applyMatrix4(c.bone.matrixWorld);
            c.b.copy(c.localB).applyMatrix4(c.bone.matrixWorld);
            c.bone.matrixWorld.decompose(_vA, c.worldQ, _vB);
        }

        // angin halus sitoplasma + aliran udara lari (gelombang merambat dari pangkal ke ujung ala Wuthering Waves)
        const moveFactor = Math.min(1, speed / 4);
        const windAmp = (.0028 + moveFactor * .0075) * dtScale;
        const wxBase = Math.sin(t * 1.35) * windAmp;
        const wzBase = Math.cos(t * 1.05) * windAmp;

        const chains = phys.chains;
        for (let ci = 0; ci < chains.length; ci++) {
            const ch = chains[ci];
            const nodes = ch.nodes;
            const pts = ch.pts;
            const L = nodes.length;

            // 1. Anchor titik pangkal pts[0] & hitung posisi rest berantai sepanjang rantai
            const ancM = ch.anchorBone.matrixWorld;
            ancM.decompose(_vA, ch.anchor.q, _vB);
            pts[0].pos.copy(nodes[0].b.position).applyMatrix4(ancM);
            pts[0].prev.copy(pts[0].pos);
            pts[0].rest.copy(pts[0].pos);

            _qRestW.copy(ch.anchor.q);
            for (let k = 0; k < L; k++) {
                _qRestW.multiply(nodes[k].restQ);
                _vB.copy(nodes[k].localDir).applyQuaternion(_qRestW).normalize();
                pts[k + 1].rest.copy(pts[k].rest).addScaledVector(_vB, nodes[k].worldLen);
            }

            // 2. Integrasi Verlet KawaiiPhysics untuk pts[1..L]
            for (let k = 1; k <= L; k++) {
                const p = pts[k];
                const tf = p.tipFrac || 0;
                const cXZ = teleported ? 1.0 : (p.isChest ? chestCarryXZ : Math.max(.10, carryXZ - tf * .24));
                const cY = teleported ? 1.0 : (p.isChest ? chestCarryY : Math.max(.04, carryY - tf * .12));
                const cx = dxRoot * cXZ, cy = dyRoot * cY, cz = dzRoot * cXZ;
                p.pos.x += cx; p.pos.y += cy; p.pos.z += cz;
                p.prev.x += cx; p.prev.y += cy; p.prev.z += cz;

                _vD.subVectors(p.pos, p.prev).multiplyScalar(1 - p.drag);
                const maxV = p.len * (p.isChest ? .35 : (.38 + tf * .18));
                if (_vD.lengthSq() > maxV * maxV) _vD.setLength(maxV);

                p.prev.copy(p.pos);
                p.pos.add(_vD);
                p.pos.addScaledVector(_vF.subVectors(p.rest, p.pos), Math.min(.5, p.stiffness * dtScale));
                p.pos.y -= p.gravity * p.len * step;
                if (!p.isChest) {
                    const wave = Math.sin(t * (1.7 + moveFactor * 1.5) + ch.chainPhase - k * .58);
                    const flutter = .30 + tf * 1.0;
                    p.pos.x += (wxBase + wave * windAmp * .75) * p.len * flutter;
                    p.pos.z += (wzBase + wave * windAmp * .65) * p.len * flutter;
                }
            }

            // 3. PBD / FABRIK 2-Arah (2 iterasi — cepat 60fps & anti-tembus):
            let chainCollided = false;
            for (let iter = 0; iter < 2; iter++) {
                // Backward pass: dorong keluar collider & tarik segmen atas ikut terangkat mulus
                for (let k = L; k >= 1; k--) {
                    const p = pts[k];
                    if (p.cols.length && resolvePointColliders(p.pos.x, p.pos.y, p.pos.z, p.cols, moveFactor, _vE)) {
                        p.pos.copy(_vE);
                        chainCollided = true;
                    }
                    if (k > 1) {
                        const prevP = pts[k - 1];
                        _vF.subVectors(prevP.pos, p.pos);
                        const d = _vF.length();
                        if (d > 1e-6) {
                            const corr = (p.len - d) / d;
                            prevP.pos.addScaledVector(_vF, corr * .5);
                        }
                    }
                }

                // Forward pass: kunci panjang bone dari pangkal & pastikan ujung bebas collider
                for (let k = 1; k <= L; k++) {
                    const prevP = pts[k - 1], p = pts[k];
                    _vF.subVectors(p.pos, prevP.pos);
                    if (_vF.lengthSq() < 1e-10) _vF.subVectors(p.rest, prevP.rest);
                    _vF.normalize();
                    p.pos.copy(prevP.pos).addScaledVector(_vF, p.len);

                    if (p.cols.length && resolvePointColliders(p.pos.x, p.pos.y, p.pos.z, p.cols, moveFactor, _vE)) {
                        p.pos.copy(_vE);
                        _vF.subVectors(p.pos, prevP.pos).normalize();
                        p.pos.copy(prevP.pos).addScaledVector(_vF, p.len);
                        chainCollided = true;
                    }
                }
            }

            // 4. Konversi posisi rantai bebas-tembus -> rotasi quaternion tiap bone & update matrixWorld 1x
            _qRestW.copy(ch.anchor.q);
            let parentWorldM = ancM;
            for (let k = 0; k < L; k++) {
                const n = nodes[k];
                const qRestBoneW = _qInv.copy(_qRestW).multiply(n.restQ);
                _vB.copy(n.localDir).applyQuaternion(qRestBoneW).normalize(); // restDirWorld
                _vF.subVectors(pts[k + 1].pos, pts[k].pos);
                if (_vF.lengthSq() < 1e-10) _vF.copy(_vB);
                else _vF.normalize();

                // jika menahan tabrakan badan/kaki, izinkan sudut lebih lebar (maks ~48°/segmen) secara mulus tanpa patah
                const lim = chainCollided ? Math.min(.85, Math.max(n.maxAngle * 2.4, .52)) : n.maxAngle;
                const cosA = clamp(_vB.dot(_vF), -1, 1);
                const ang = Math.acos(cosA);
                if (ang > lim) {
                    const keep = Math.sin(lim) / Math.max(Math.sin(ang), 1e-5);
                    const base = Math.cos(lim) - cosA * keep;
                    _vF.multiplyScalar(keep).addScaledVector(_vB, base).normalize();
                    pts[k + 1].pos.copy(pts[k].pos).addScaledVector(_vF, n.worldLen);
                }

                // konversi arah target dunia -> ruang rest lokal bone (langsung dari Verlet KawaiiPhysics tanpa double-lag)
                _qDelta.copy(qRestBoneW).invert();
                _vG.copy(_vF).applyQuaternion(_qDelta).normalize();
                _qDelta.setFromUnitVectors(n.localDir, _vG);
                _qTarget.copy(n.restQ).multiply(_qDelta);

                const slerpK = 1 - Math.exp(-step * (chainCollided ? 40 : n.smoothRate));
                n.b.quaternion.slerp(_qTarget, slerpK);

                // propagate worldQ & matrixWorld untuk bone berikutnya di rantai
                _qRestW.multiply(n.b.quaternion);
                n.b.updateMatrix();
                n.b.matrixWorld.multiplyMatrices(parentWorldM, n.b.matrix);
                parentWorldM = n.b.matrixWorld;
            }
        }
    }

    // siapkan GrantSolver, fisika pegas dada, fisika rambut/baju PBD, & kedipan mata MMD
    function setupMmdExtras(mesh, rigList) {
        const extras = { grantSolver: null, grantRest: [], chestSprings: null, physics: null, blinkMesh: null, blinkIdx: -1, blinkTimer: 2.5, blinkDur: 0 };
        if (!mesh || !mesh.isSkinnedMesh) return extras;

        const posedSet = new Set((rigList || []).map(d => d.b));
        const grants = mesh.geometry && mesh.geometry.userData && mesh.geometry.userData.MMD && mesh.geometry.userData.MMD.grants;
        if (grants && grants.length && T.MMDAnimationHelper) {
            try {
                const helper = new T.MMDAnimationHelper();
                extras.grantSolver = helper.createGrantSolver(mesh);
                const bones = mesh.skeleton ? mesh.skeleton.bones : [];
                const seen = new Set();
                for (const g of grants) {
                    const b = bones[g.index];
                    if (b && !seen.has(b) && !posedSet.has(b)) {
                        seen.add(b);
                        extras.grantRest.push({ b, rest: b.quaternion.clone() });
                    }
                }
            } catch (e) { console.warn('MMD GrantSolver dilewati:', e); }
        }

        // fisika pegas 2nd-order khusus bone dada (dikeluarkan dari PBD generik agar tidak saling timpa)
        try {
            extras.chestSprings = setupChestSprings(mesh);
            if (extras.chestSprings) {
                for (const b of extras.chestSprings.boneSet) posedSet.add(b);
            }
        } catch (e) { console.warn('MMD ChestSprings dilewati:', e); }

        // fisika rambut, pakaian, rok, pita dari rigidBodies PMX
        try {
            extras.physics = setupMmdPhysics(mesh, posedSet);
        } catch (e) { console.warn('MMD Physics dilewati:', e); }

        const dict = mesh.morphTargetDictionary;
        if (dict && mesh.morphTargetInfluences) {
            const blinkKey = Object.keys(dict).find(k => /^(まばたき|blink|eye.?blink)$/i.test(k.trim()));
            if (blinkKey !== undefined) {
                extras.blinkMesh = mesh;
                extras.blinkIdx = dict[blinkKey];
            }
        }
        return extras;
    }

    function updateMmdExtras(extras, dt, t = 0, speed = 0, phase = 0, move = 0, turnRate = 0, bodyY = 0, actorYaw = 0) {
        if (!extras) return;
        // 1. Jalankan pegas dada SEBELUM GrantSolver agar model yang memakai grant dada (seperti Iuno: 左胸 -> 左胸1)
        // langsung mewariskan pantulan dada ke mesh skinning pada frame yang sama!
        if (extras.chestSprings) {
            updateChestSprings(extras.chestSprings, dt, t, speed, phase, move, turnRate, bodyY, actorYaw);
        }
        if (extras.grantSolver) {
            for (const g of extras.grantRest) g.b.quaternion.copy(g.rest);
            extras.grantSolver.update();
            // WAJIB: perbarui matrixWorld bone deform (左足D, 右足D, 左ひざD, 右ひざD)
            // SETELAH grantSolver.update() supaya collider paha & lutut ikut bergerak di frame yang sama!
            if (extras.physics && extras.physics.mesh) extras.physics.mesh.updateMatrixWorld(true);
        }
        if (extras.physics) {
            updateMmdPhysics(extras.physics, dt, t, speed);
        }
        if (extras.blinkMesh && extras.blinkIdx >= 0) {
            extras.blinkTimer -= dt;
            if (extras.blinkTimer <= 0) {
                extras.blinkDur = .16;
                extras.blinkTimer = 2.6 + Math.random() * 3.2;
            }
            if (extras.blinkDur > 0) {
                extras.blinkDur = Math.max(0, extras.blinkDur - dt);
                extras.blinkMesh.morphTargetInfluences[extras.blinkIdx] = Math.sin((extras.blinkDur / .16) * Math.PI);
            } else {
                extras.blinkMesh.morphTargetInfluences[extras.blinkIdx] = 0;
            }
        }
    }

    // rotasi bone dalam ruang sumbu dunia karakter: px (pitch X), py (yaw Y), pz (roll Z)
    function setBone(bones, key, px = 0, py = 0, pz = 0) {
        const d = bones.byKey ? bones.byKey[key] : bones.find(x => x.key === key);
        if (!d) return;
        d.b.quaternion.copy(d.rest);
        if (py) d.b.quaternion.multiply(_q1.setFromAxisAngle(d.axisY, py));
        if (px) d.b.quaternion.multiply(_q2.setFromAxisAngle(d.axisX, px));
        const rz = (d.lower || 0) + pz;
        if (rz) d.b.quaternion.multiply(_q3.setFromAxisAngle(d.axisZ, rz));
    }

    // hitung pose full-body yang luwes & ekspresif (idle, jalan/lari anime, belok, selebrasi)
    // chibi=true (Cellcy astronot) memakai tekukan lutut/pergelangan lebih halus agar sepatu boot tebal tidak melar
    function applyFullPose(bones, t, phase, move, turnRate, celeb, chibi = false) {
        if (!bones || !bones.length) return;
        const sw = Math.sin(phase), cw = Math.cos(phase);
        const sw2 = -sw, cw2 = -cw;
        const br = Math.sin(t * 2.1), br2 = Math.sin(t * 1.05);
        const idle = 1 - move;

        if (chibi) {
            // --- Cellcy (proporsi chibi): lutut tetap menekuk jelas & natural saat melangkah ---
            const cL = Math.cos(phase), sL = Math.sin(phase);
            const cR = -cL, sR = -sL;
            const lupPitch = (-.10 - .42 * cL + .22 * sL) * move + .01 * idle * br2;
            const rupPitch = (-.10 - .42 * cR + .22 * sR) * move - .01 * idle * br2;
            const lKnee = Math.max(0, (.46 - .34 * cL - .24 * sL) * move) + .03 * idle;
            const rKnee = Math.max(0, (.46 - .34 * cR - .24 * sR) * move) + .03 * idle;
            setBone(bones, 'lup', lupPitch, 0, .015 * move);
            setBone(bones, 'rup', rupPitch, 0, -.015 * move);
            setBone(bones, 'lknee', lKnee, 0, 0);
            setBone(bones, 'rknee', rKnee, 0, 0);
            setBone(bones, 'lfoot', (.04 - .16 * cL + .12 * sL) * move, 0, 0);
            setBone(bones, 'rfoot', (.04 - .16 * cR + .12 * sR) * move, 0, 0);
        } else {
            // --- Karakter MMD: siklus jalan/jog anime 4-keyframe dengan tekukan lutut dalam & luwes ---
            // p=0 (menapak lutut lentur ~20°), π/2 (tumpu ~24°), π (tolak belakang lutut tekuk ~85°–91°), 3π/2 (ayun lutut ke depan ~73°)
            const pL = phase, pR = phase + Math.PI;
            const cL = Math.cos(pL), sL = Math.sin(pL), c2 = Math.cos(pL * 2);
            const cR = -cL, sR = -sL;

            // paha: melangkah tegas ke depan (-39°) & mendorong rapi ke belakang (+23°)
            const lupPitch = (-.17 - .43 * cL + .37 * sL + .14 * c2) * move + .008 * idle * br2;
            const rupPitch = (-.17 - .43 * cR + .37 * sR + .14 * c2) * move - .008 * idle * br2;

            // lutut (+X = tekuk ke belakang): selalu lentur (min ~12° saat tumpu, puncak ~88°–91° saat angkat kaki)
            // tidak pernah lurus kaku / goose-step!
            const lKnee = Math.max(0, (.88 - .57 * cL - .43 * sL + .03 * c2) * move) + .035 * idle;
            const rKnee = Math.max(0, (.88 - .57 * cR - .43 * sR + .03 * c2) * move) + .035 * idle;

            // pergelangan kaki: fleksi lembut saat mendarat, dorongan ujung kaki saat tolak belakang
            const lFoot = (.12 - .22 * cL - .05 * sL) * move;
            const rFoot = (.12 - .22 * cR - .05 * sR) * move;

            setBone(bones, 'lup', lupPitch, 0, .018 * move);
            setBone(bones, 'rup', rupPitch, 0, -.018 * move);
            setBone(bones, 'lknee', lKnee, 0, 0);
            setBone(bones, 'rknee', rKnee, 0, 0);
            setBone(bones, 'lfoot', lFoot, 0, 0);
            setBone(bones, 'rfoot', rFoot, 0, 0);
        }

        // fase ayunan lawan-kaki (p=0 kaki kiri di depan -> pinggul putar kanan, lengan kiri di belakang & lengan kanan di depan)
        const strideWave = Math.cos(phase + .35);
        const hipRoll = Math.sin(phase);
        // lag belok halus: kaki & pinggul memimpin belokan, badan atas & kepala mengikuti mulus (TIDAK langsung menoleh mendadak!)
        const turnLag = clamp(-turnRate * .06, -.16, .16);

        // pinggul & tulang belakang (counter-rotation luwes; condong lari HANYA di spine/chest bukan di lantai!)
        setBone(bones, 'hips', (chibi ? .04 : .03) * move, -strideWave * (chibi ? .11 : .15) * move + clamp(turnRate * .05, -.14, .14), hipRoll * (chibi ? .035 : .048) * move + br2 * .014 * idle);
        setBone(bones, 'spine', (chibi ? .04 : .11) * move + Math.cos(phase * 2) * .03 * move + .018 * br * idle, strideWave * (chibi ? .08 : .13) * move + turnLag * .45, -hipRoll * .026 * move);
        setBone(bones, 'chest', (chibi ? .03 : .065) * move + Math.cos(phase * 2 + .4) * .025 * move + .024 * br * idle, strideWave * (chibi ? .11 : .16) * move + turnLag * .55, -hipRoll * .032 * move);

        // bahu ikut mengayun lembut mengikuti tarikan lengan
        setBone(bones, 'lclav', strideWave * .08 * move, -strideWave * .10 * move, .025 * br * idle + strideWave * .06 * move);
        setBone(bones, 'rclav', -strideWave * .08 * move, strideWave * .10 * move, -.025 * br * idle - strideWave * .06 * move);

        // lengan & siku luwes kontinu (tanpa flat-clamp!):
        // lengan atas mengayun simetris depan-belakang, siku menyusul dengan lag inersia (0.48 rad) & melengkung lembut ke dalam
        const armSwing = (chibi ? .54 : .66) * move + .03;
        const lArmX = (chibi ? 0 : -.06 * move) + strideWave * armSwing + Math.sin(t * 1.4) * .025 * idle;
        const rArmX = (chibi ? 0 : -.06 * move) - strideWave * armSwing + Math.sin(t * 1.4 + .7) * .025 * idle;

        // lag inersia siku & pergelangan tangan agar gerak lengan terasa cair seperti animasi tangan asli
        const elbLagL = Math.cos(phase + .35 - .48); // -1 saat lengan maju (siku menekuk penuh ~100°), +1 saat mundur (~34°)
        const elbLagR = -elbLagL;
        const lForeX = -(.20 * idle + ((chibi ? .68 : 1.16) - elbLagL * (chibi ? .36 : .58)) * move + .03 * br * idle);
        const rForeX = -(.20 * idle + ((chibi ? .68 : 1.16) - elbLagR * (chibi ? .36 : .58)) * move + .03 * br * idle);

        // saat lengan maju, siku tetap rapi di luar dada (anti-tembus) sementara lengan bawah sedikit mengarah lembut ke dalam
        const lIn = (.5 - .5 * elbLagL) * move;
        const rIn = (.5 - .5 * elbLagR) * move;
        const lArmY = chibi ? 0 : -(.04 + lIn * .12) * move;
        const rArmY = chibi ? 0 : (.04 + rIn * .12) * move;
        const lArmZ = chibi ? (.04 * move) : (.03 + .05 * (1 - lIn)) * move + .02 * br * idle;
        const rArmZ = chibi ? (-.04 * move) : -(.03 + .05 * (1 - rIn)) * move - .02 * br * idle;
        const lForeY = chibi ? 0 : -(.08 + lIn * .16) * move;
        const rForeY = chibi ? 0 : (.08 + rIn * .16) * move;

        // pergelangan tangan ikut mengayun lembut mengikuti momentum lengan bawah
        const handLagL = Math.cos(phase + .35 - .95);
        const handLagR = -handLagL;

        setBone(bones, 'larm', lArmX, lArmY, lArmZ);
        setBone(bones, 'lfore', lForeX, lForeY, 0);
        setBone(bones, 'lhand', handLagL * .30 * move + .04 * br * idle, -lIn * .12 * move, (.08 + handLagL * .14) * move + .04 * br * idle);

        // lengan kanan: saat selebrasi (menemukan organel), angkat & lambaikan!
        if (celeb > 0.01) {
            const w = Math.sin(celeb * Math.PI);
            const wave = Math.sin(t * 14) * .38 * w;
            setBone(bones, 'rarm', rArmX * (1 - w) - .35 * w, 0, -1.25 * w);
            setBone(bones, 'rfore', rForeX * (1 - w) - .95 * w, 0, wave);
            setBone(bones, 'rhand', 0, 0, Math.sin(t * 14 + .8) * .28 * w);
        } else {
            setBone(bones, 'rarm', rArmX, rArmY, rArmZ);
            setBone(bones, 'rfore', rForeX, rForeY, 0);
            setBone(bones, 'rhand', handLagR * .30 * move + .04 * br * idle, rIn * .12 * move, -(.08 + handLagR * .14) * move - .04 * br * idle);
        }

        // leher & kepala: saat belok TIDAK langsung menoleh mendadak — mengikuti arah gerak kaki & badan secara mulus seperti Cellcy!
        const lookYaw = turnLag * .65 + Math.sin(t * .55) * .12 * idle + Math.sin(t * .27) * .06 * idle;
        const lookPitch = -.05 * move + Math.cos(phase * 2 + .5) * .04 * move + Math.sin(t * .85) * .04 * idle;
        const lookRoll = clamp(-turnRate * .04, -.09, .09) + Math.sin(t * .42) * .04 * idle;
        setBone(bones, 'neck', lookPitch * .42, lookYaw * .45, lookRoll * .4);
        setBone(bones, 'head', lookPitch * .58, lookYaw * .55, lookRoll * .55);
    }

    // ---------- material PBR mewah untuk FBX Cellcy ----------
    function upgradeFbxMaterial(m, isSkinned) {
        if (!m) return m;
        if (m.map) m.map.anisotropy = 8;
        const std = new T.MeshPhysicalMaterial({
            name: m.name || 'CellcyMat',
            color: m.color ? m.color.clone() : new T.Color(0xffffff),
            map: m.map || null,
            normalMap: m.normalMap || null,
            normalScale: new T.Vector2(.9, .9),
            roughness: .36,
            metalness: .06,
            clearcoat: .55,
            clearcoatRoughness: .22,
            side: T.DoubleSide,
            shadowSide: T.DoubleSide,
            skinning: !!isSkinned,
            vertexColors: false
        });
        std.customProgramCacheKey = () => 'cellcy_lux_v2_' + (isSkinned ? 1 : 0);
        std.onBeforeCompile = s => {
            s.fragmentShader = s.fragmentShader.replace(
                'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
                'float _fr=pow(1.0-abs(dot(normalize(vNormal),normalize(vViewPosition))),2.6);' +
                'vec3 _rimCol=mix(vec3(0.32,0.96,0.90),vec3(0.85,0.45,1.0),clamp(vNormal.y*0.5+0.5,0.0,1.0));' +
                'outgoingLight+=_rimCol*_fr*0.18;' +
                'gl_FragColor = vec4( outgoingLight, diffuseColor.a );'
            );
        };
        return std;
    }

    // ---------- kalibrasi material Toon MMD agar warna akurat & tidak silau bloom ----------
    function polishMmdMaterial(m, isSkinned) {
        if (!m) return m;
        m.skinning = !!isSkinned;
        if (m.map) {
            m.map.encoding = T.sRGBEncoding;
            m.map.anisotropy = 8;
        }
        // Matikan envMap/sphere-map aditif dan emissive putih bawaan PMX agar tidak overbright
        if ('envMap' in m) m.envMap = null;
        if (m.emissive && m.emissive.isColor) m.emissive.setRGB(0, 0, 0);
        m.emissiveIntensity = 0;
        // Kompensasi total 4 lampu scene (~2.1x irradiance pada MeshToonMaterial, agak cyan)
        // supaya warna putih, kulit, dan rambut anime tetap tajam & tidak terbakar bloom
        if (m.color && m.color.isColor) {
            m.color.r *= .47;
            m.color.g *= .42;
            m.color.b *= .42;
        }
        m.needsUpdate = true;
        return m;
    }

    // bersihkan model lama dari scene sebelum ganti karakter
    function clearActiveModel() {
        if (!tpl) return;
        if (tpl.parent) tpl.parent.remove(tpl);
        tpl.traverse(o => {
            if (o.skeleton && o.skeleton.dispose) o.skeleton.dispose();
            if (o.geometry) o.geometry.dispose();
            if (o.material) {
                const mats = Array.isArray(o.material) ? o.material : [o.material];
                for (const m of mats) {
                    if (!m) continue;
                    if (m.map && m.map.dispose) m.map.dispose();
                    if (m.normalMap && m.normalMap.dispose) m.normalMap.dispose();
                    if (m.dispose) m.dispose();
                }
            }
        });
        tpl = null;
        rig = null;
        mmdExtra = null;
        ready = false;
    }

    function updateHudLabel(charDef) {
        const el = document.getElementById('hud-cname');
        if (el) el.textContent = 'Karakter: ' + (charDef ? charDef.name : 'Cellcy');
    }

    // ---------- pasang model (FBX atau MMD) ke rig game ----------
    function mountModel(obj, charDef, seq) {
        if (seq !== loadSeq) return; // abaikan jika sudah ada pilihan karakter lebih baru
        clearActiveModel();

        const isMmd = charDef.type === 'mmd';
        tpl = obj;
        tpl.traverse(o => {
            if (o.isMesh) {
                o.frustumCulled = false;
                o.renderOrder = 3;
                if (!isMmd && o.geometry && o.geometry.attributes && o.geometry.attributes.color) {
                    o.geometry.deleteAttribute('color');
                }
                const mats = Array.isArray(o.material) ? o.material : [o.material];
                const next = mats.map(m => isMmd ? polishMmdMaterial(m, o.isSkinnedMesh) : upgradeFbxMaterial(m, o.isSkinnedMesh));
                o.material = Array.isArray(o.material) ? next : next[0];
            }
        });

        // orientasi awal: FBX AccuRig Z-up -> Y-up; MMD sudah Y-up
        if (!isMmd) {
            tpl.rotation.x = -Math.PI / 2;
        } else {
            // deteksi otomatis arah hadap MMD (+Z vs -Z) dari posisi bahu kiri vs kanan
            tpl.updateMatrixWorld(true);
            const la = findBone(tpl, ['左腕', 'leftarm', 'upperarml', 'arml']);
            const ra = findBone(tpl, ['右腕', 'rightarm', 'upperarmr', 'armr']);
            if (la && ra) {
                const lp = la.getWorldPosition(new T.Vector3());
                const rp = ra.getWorldPosition(new T.Vector3());
                if (lp.x < rp.x) tpl.rotation.y = Math.PI;
            }
        }

        tpl.updateMatrixWorld(true);
        const box = new T.Box3().setFromObject(tpl);
        let h = box.max.y - box.min.y;
        let minY = box.min.y;
        if ((!isFinite(h) || h <= 0.001) && tpl.geometry) {
            tpl.geometry.computeBoundingBox();
            const gb = tpl.geometry.boundingBox;
            if (gb) { h = gb.max.y - gb.min.y; minY = gb.min.y; }
        }
        const sc = (isFinite(h) && h > 0.001) ? TARGET_H / h : (isMmd ? .26 : .0267);
        tpl.scale.setScalar(sc);
        tpl.position.y = isFinite(minY) ? -minY * sc : 0;

        // PENTING: hitung rigInfo SEBELUM tpl dimasukkan ke body/actor, agar sumbu lokal bone
        // (axisX/Y/Z & sudut turun lengan) selalu murni menghadap +Z dan tidak terpengaruh
        // rotasi actor.rotation.y saat pemain berganti karakter di tengah permainan!
        tpl.updateMatrixWorld(true);
        rig = rigInfo(tpl);

        body.add(tpl);
        body.position.y = 0;
        body.scale.set(1, 1, 1);
        lean.rotation.set(0, 0, 0);
        P.updateMatrixWorld(true);
        // setupMmdExtras dipanggil SETELAH tpl masuk ke P agar posisi awal Verlet (currTip/prevTip)
        // langsung berada di koordinat dunia pemain P (tidak lompat dari origin 0,0,0 pada frame pertama)
        mmdExtra = isMmd ? setupMmdExtras(tpl, rig) : null;
        activeChar = charDef;
        loadedChar = charDef;
        ready = true;
        probe.visible = false;
        hideBadge();
        updateHudLabel(charDef);
        try { localStorage.setItem(STORAGE_KEY, charDef.id); } catch {}
        syncPickerHighlight();

        if (typeof toast === 'function' && (!window.gameLoader || window.gameLoader.isDone())) {
            const boneCount = rig ? rig.length : 0;
            toast(`Karakter <b>${esc(charDef.name)}</b> siap! (${isMmd ? 'MMD · ' + boneCount + ' bone aktif' : 'FBX Rig'})`, false, 3000);
        }

        // jika masih dalam loading screen awal, tunggu semua tekstur model selesai di-decode lalu pra-render GPU
        if (window.gameLoader && !window.gameLoader.isDone()) {
            window.gameLoader.set(86, `Memuat tekstur ${charDef.name}…`, 'Menyiapkan material 3D');
            waitModelTextures(tpl).then(() => {
                if (window.gameLoader && !window.gameLoader.isDone()) window.gameLoader.finish();
            });
        }
    }

    function waitModelTextures(rootObj) {
        const imgs = [];
        if (rootObj) {
            rootObj.traverse(o => {
                if (!o.isMesh || !o.material) return;
                const mats = Array.isArray(o.material) ? o.material : [o.material];
                for (const m of mats) {
                    if (!m) continue;
                    for (const k of ['map', 'normalMap', 'emissiveMap', 'alphaMap', 'gradientMap']) {
                        const tex = m[k];
                        const im = tex && tex.image;
                        if (im && typeof im.complete === 'boolean' && !im.complete && !imgs.includes(im)) {
                            imgs.push(im);
                        }
                    }
                }
            });
        }
        if (!imgs.length) return Promise.resolve();
        return new Promise(resolve => {
            let left = imgs.length;
            const doneOne = () => { if (--left <= 0) resolve(); };
            for (const im of imgs) {
                im.addEventListener('load', doneOne, { once: true });
                im.addEventListener('error', doneOne, { once: true });
            }
            setTimeout(resolve, 6000);
        });
    }

    function reportBootProgress(name, loaded, total) {
        if (!window.gameLoader || window.gameLoader.isDone()) return;
        const mb = (loaded / 1048576).toFixed(1);
        if (total > 0) {
            const frac = clamp(loaded / total, 0, 1);
            const pct = 25 + frac * 55; // 25% -> 80%
            const totMb = (total / 1048576).toFixed(1);
            window.gameLoader.set(pct, `Mengunduh aset ${name}…`, `${mb} / ${totMb} MB`);
        } else if (loaded > 0) {
            window.gameLoader.set(50, `Mengunduh aset ${name}…`, `${mb} MB`);
        }
    }

    function onProgress(name, p) {
        if (p && p.total) {
            showBadge(`Memuat ${name}… ${Math.round(p.loaded / p.total * 100)}%`);
            reportBootProgress(name, p.loaded, p.total);
        } else if (p && p.loaded) {
            showBadge(`Memuat ${name}… ${(p.loaded / 1048576).toFixed(1)} MB`);
            reportBootProgress(name, p.loaded, 0);
        } else {
            showBadge(`Memuat ${name}…`);
        }
    }

    function onError(charDef, seq, e) {
        if (seq !== loadSeq) return;
        hideBadge();
        if (!tpl) probe.visible = true;
        console.warn('Gagal memuat karakter 3D:', charDef && charDef.url, e);
        if (window.gameLoader && !window.gameLoader.isDone()) {
            window.gameLoader.finish();
        }
        if (typeof toast === 'function') {
            toast(`Gagal memuat <b>${esc(charDef ? charDef.name : 'karakter')}</b>. Pastikan berkas & teksturnya lengkap di folder direktori.`, true, 6000);
        }
    }

    const fbxLoader = T.FBXLoader ? new T.FBXLoader() : null;
    const mmdLoader = T.MMDLoader ? new T.MMDLoader() : null;
    const fbxBufCache = new Map();

    // unduh berkas chunk FBX secara paralel dengan pelacakan progres byte real-time
    async function fetchPartsWithProgress(parts, name, seq) {
        const totals = new Array(parts.length).fill(0);
        const loadeds = new Array(parts.length).fill(0);
        const notify = () => {
            if (seq !== loadSeq) return;
            const l = loadeds.reduce((a, b) => a + b, 0);
            const t = totals.reduce((a, b) => a + b, 0);
            onProgress(name, { loaded: l, total: t });
        };
        const bufs = await Promise.all(parts.map(async (u, idx) => {
            const r = await fetch(u);
            if (!r.ok) throw new Error('HTTP ' + r.status + ' (' + u + ')');
            const cl = +(r.headers.get('content-length') || 0);
            if (cl > 0) totals[idx] = cl;
            if (!r.body || !r.body.getReader) {
                const ab = await r.arrayBuffer();
                loadeds[idx] = ab.byteLength;
                if (!totals[idx]) totals[idx] = ab.byteLength;
                notify();
                return new Uint8Array(ab);
            }
            const reader = r.body.getReader();
            const chunks = [];
            let got = 0;
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                got += value.byteLength;
                loadeds[idx] = got;
                notify();
            }
            const out = new Uint8Array(got);
            let off = 0;
            for (const c of chunks) { out.set(c, off); off += c.byteLength; }
            return out;
        }));
        const totalBytes = bufs.reduce((s, b) => s + b.byteLength, 0);
        const merged = new Uint8Array(totalBytes);
        let off = 0;
        for (const b of bufs) { merged.set(b, off); off += b.byteLength; }
        return merged.buffer;
    }

    window.loadCharacter = function loadCharacter(charDef) {
        const def = charDef || DEFAULT_CHAR;
        const seq = ++loadSeq;
        activeChar = def;
        syncPickerHighlight();
        showBadge(`Memuat ${def.name}…`);
        if (window.gameLoader && !window.gameLoader.isDone()) {
            window.gameLoader.set(25, `Mengunduh aset ${def.name}…`, 'Menghubungkan ke server…');
        }

        if (def.type === 'mmd') {
            if (!mmdLoader) return onError(def, seq, 'MMDLoader tidak tersedia');
            // resourcePath otomatis mengikuti folder .pmx/.pmd agar tekstur relatif ditemukan
            mmdLoader.load(
                def.url,
                mesh => {
                    if (window.gameLoader && !window.gameLoader.isDone()) {
                        window.gameLoader.set(82, `Menyusun rig & fisika ${def.name}…`, 'Parsing bone MMD');
                    }
                    mountModel(mesh, def, seq);
                },
                p => onProgress(def.name, p),
                err => onError(def, seq, err)
            );
        } else {
            if (!fbxLoader) return onError(def, seq, 'FBXLoader tidak tersedia');
            const parts = Array.isArray(def.parts) && def.parts.length
                ? def.parts
                : (def.id === DEFAULT_CHAR.id ? DEFAULT_CHAR.parts : null);
            if (parts && parts.length) {
                const basePath = (def.url || 'models/').replace(/[^/]*$/, '');
                const cacheKey = parts.join('|');
                const cached = fbxBufCache.get(cacheKey);
                const bufPromise = cached
                    ? Promise.resolve(cached)
                    : fetchPartsWithProgress(parts, def.name, seq).then(ab => { fbxBufCache.set(cacheKey, ab); return ab; });
                bufPromise.then(ab => {
                    if (seq !== loadSeq) return;
                    if (window.gameLoader && !window.gameLoader.isDone()) {
                        window.gameLoader.set(82, `Memproses model 3D ${def.name}…`, 'Parsing geometri & rig FBX');
                    }
                    // beri 1 frame agar UI progres sempat tergambar sebelum parsing sinkron FBX
                    requestAnimationFrame(() => {
                        if (seq !== loadSeq) return;
                        try {
                            const obj = fbxLoader.parse(ab, basePath);
                            mountModel(obj, def, seq);
                        } catch (err) { onError(def, seq, err); }
                    });
                }).catch(err => onError(def, seq, err));
            } else {
                fbxLoader.load(
                    def.url,
                    obj => mountModel(obj, def, seq),
                    p => onProgress(def.name, p),
                    err => onError(def, seq, err)
                );
            }
        }
    };

    window.getActiveCharacter = () => activeChar;

    // ---------- pindai direktori karakter (/api/characters) & UI Pilih Karakter ----------
    window.fetchCharacters = async function fetchCharacters() {
        const urls = ['/api/characters', 'models/mmd/characters.json'];
        for (const u of urls) {
            try {
                const res = await fetch(u, { cache: 'no-store' });
                if (!res.ok) continue;
                const data = await res.json();
                if (data && Array.isArray(data.characters) && data.characters.length) {
                    charCatalog = data.characters;
                    return charCatalog;
                }
            } catch {}
        }
        charCatalog = [DEFAULT_CHAR];
        return charCatalog;
    };

    function syncPickerHighlight() {
        const grid = document.getElementById('char-grid');
        if (!grid) return;
        grid.querySelectorAll('.char-item').forEach(btn => {
            btn.classList.toggle('sel', btn.dataset.id === activeChar.id);
        });
    }

    window.renderCharPicker = async function renderCharPicker(rescan = false) {
        const grid = document.getElementById('char-grid');
        const info = document.getElementById('char-dir-info');
        const refBtn = document.getElementById('char-refresh');
        if (!grid) return;

        if (rescan || charCatalog.length <= 1) {
            grid.innerHTML = '<div style="grid-column:1/-1;padding:16px;text-align:center;color:var(--mut);font-size:13px">Memindai direktori <code>public/models/mmd/</code>…</div>';
            await window.fetchCharacters();
        }

        const mmdCount = charCatalog.filter(c => c.type === 'mmd').length;
        grid.innerHTML = charCatalog.map(c => {
            const isSel = c.id === activeChar.id;
            const icon = c.thumb
                ? `<img src="${esc(c.thumb)}" alt="${esc(c.name)}" loading="lazy">`
                : (c.type === 'mmd' ? '✨' : '🚀');
            const badgeText = c.type === 'mmd' ? `MMD · ${esc(c.format || 'PMX')}` : 'DEFAULT · FBX';
            return `<button type="button" class="char-item${isSel ? ' sel' : ''}" data-id="${esc(c.id)}" title="${esc(c.subtitle || c.url)}">` +
                `<div class="char-ico">${icon}</div>` +
                `<div class="char-name">${esc(c.name)}</div>` +
                `<span class="char-badge${c.type === 'mmd' ? ' mmd' : ''}">${badgeText}</span>` +
                `</button>`;
        }).join('');

        grid.querySelectorAll('.char-item').forEach(btn => {
            btn.onclick = () => {
                const picked = charCatalog.find(c => c.id === btn.dataset.id);
                if (!picked) return;
                if (picked.id === activeChar.id && ready) return;
                window.loadCharacter(picked);
            };
        });

        if (info) {
            info.innerHTML = mmdCount > 0
                ? `Ditemukan <b>${mmdCount} karakter MMD</b> di <code>public/models/mmd/</code>`
                : `Belum ada MMD. Taruh folder <code>.pmx/.pmd</code> ke <code>public/models/mmd/</code>`;
        }
        if (refBtn) {
            refBtn.onclick = () => window.renderCharPicker(true);
        }
    };

    // inisialisasi awal: pindai direktori -> muat karakter tersimpan atau Cellcy default
    (async () => {
        if (window.gameLoader && !window.gameLoader.isDone()) {
            window.gameLoader.set(20, 'Memindai daftar karakter…', 'Membaca katalog aset');
        }
        await window.fetchCharacters();
        let savedId = null;
        try { savedId = localStorage.getItem(STORAGE_KEY); } catch {}
        const initial = charCatalog.find(c => c.id === savedId) || charCatalog[0] || DEFAULT_CHAR;
        activeChar = initial;
        window.renderCharPicker(false);
        window.loadCharacter(initial);
    })();

    // ---------- animasi tiap frame ----------
    let phase = 0, prevStep = 0, face = 0, faceT = 0, turnSmooth = 0, moveSmooth = 0, celebT = 0;

    window.charCelebrate = () => { celebT = 1.45; spawnRipple(); };

    window.charTick = (dt, t, speed) => {
        // update riak langkah
        for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i]; r.age += dt;
            const k = r.age / .75;
            r.m.scale.setScalar(1 + k * 3.2);
            r.m.material.opacity = Math.max(0, (1 - k) * .48);
            if (k >= 1) { if (r.m.parent) r.m.parent.remove(r.m); r.m.material.dispose(); ripples.splice(i, 1); }
        }
        // update partikel orbit di sekitar karakter
        const mp = moteG.attributes.position.array;
        const spdBoost = 1 + Math.min(1, speed / 6) * 1.4;
        for (let i = 0; i < MOTE_N; i++) {
            const s = moteSeed[i];
            const ang = s.a + t * s.sp * spdBoost;
            const rad = s.r + Math.sin(t * 1.6 + s.ph) * .18;
            mp[i * 3] = Math.cos(ang) * rad;
            mp[i * 3 + 1] = s.y + Math.sin(t * 2.1 + s.ph) * .24;
            mp[i * 3 + 2] = Math.sin(ang) * rad;
        }
        moteG.attributes.position.needsUpdate = true;
        motes.material.opacity = .45 + .22 * Math.sin(t * 2.4) + Math.min(1, speed / 6) * .2;

        // aura ganda berputar
        aura.material.opacity = .45 + Math.sin(t * 2.8) * .14 + Math.min(1, speed / 6) * .12;
        aura.scale.setScalar(1 + Math.sin(t * 2.8) * .045);
        auraOuter.rotation.z = t * .85;
        auraOuter.material.opacity = .28 + Math.sin(t * 2.1 + 1) * .1 + Math.min(1, speed / 6) * .14;
        glowPad.material.opacity = .58 + Math.sin(t * 2.2) * .14;

        if (!ready) {
            probe.position.y = 1.3 + Math.sin(t * 2) * .15;
            ring.rotation.z = vel.x * .04; ring.rotation.x = Math.PI / 2 + vel.z * .04; core.rotation.y = t; core.rotation.x = t * .6;
            return;
        }

        const isChibi = !loadedChar || loadedChar.type !== 'mmd';
        const targetMove = Math.min(1, speed / 6);
        moveSmooth += (targetMove - moveSmooth) * (1 - Math.exp(-dt * 10));
        // ritme langkah natural: MMD bertubuh tinggi ~1.4 siklus/dtk (jog anime natural), chibi lebih cepat
        phase += dt * (isChibi ? (2.2 + speed * 1.2) : (1.2 + speed * .86));

        // deteksi langkah kaki untuk riak bio-luminesen
        const stepIdx = Math.floor(phase / Math.PI);
        if (stepIdx !== prevStep) {
            prevStep = stepIdx;
            if (moveSmooth > .28) spawnRipple();
        }

        // arah hadap & belok mulus mengikuti gerak langkah kaki (tidak patah/langsung menoleh mendadak)
        if (speed > .35) faceT = Math.atan2(vel.x, vel.z);
        let d = faceT - face; d = ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        // kecepatan putar mengikuti irama kaki yang sedang melangkah (lebih responsif saat kaki terangkat/berpijak)
        const turnSpeed = (isChibi ? 8.5 : 6.8) * (.72 + .28 * Math.abs(Math.sin(phase)));
        const stepTurn = d * (1 - Math.exp(-dt * turnSpeed));
        face += stepTurn;
        actor.rotation.y = face;
        const turnRate = clamp(stepTurn / Math.max(dt, .001), -5, 5);
        turnSmooth += (turnRate - turnSmooth) * (1 - Math.exp(-dt * 6));
        // saat berbelok tajam di tempat, dorong sedikit gerak melangkah agar kaki ikut berputar (tidak menggeser kaku)
        const turnStepBoost = Math.min(.55, Math.abs(d) * .55);
        const effMove = Math.max(moveSmooth, turnStepBoost);

        // selebrasi hop + wave
        let celebFrac = 0, hopY = 0, sq = 0;
        if (celebT > 0) {
            celebT = Math.max(0, celebT - dt);
            celebFrac = celebT / 1.45;
            const hp = Math.sin(celebFrac * Math.PI);
            hopY = hp * .62;
            sq = Math.sin(celebFrac * Math.PI * 2) * .045;
        }

        applyFullPose(rig, t, phase, effMove, turnSmooth, celebFrac, isChibi);

        // tinggi pinggul membumi: turun sedikit saat kaki menapak & menekuk lutut (p=π/4, 5π/4) agar telapak kaki tetap menapak lantai!
        const walkBounce = isChibi
            ? (-Math.sin(phase * 2) * .10 - .02) * effMove
            : (-Math.sin(phase * 2) * .10 - .04) * effMove;
        const idleFloat = isChibi ? Math.sin(t * 2.1) * .035 * (1 - effMove) : 0;
        body.position.y = walkBounce + idleFloat + hopY;
        const stretch = isChibi ? (1 + sq + Math.sin(phase * 2) * .015 * effMove) : (1 + sq);
        body.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));

        // PENTING: pada MMD jangan miringkan lean.rotation.x di lantai (bikin kedua kaki tertinggal di belakang!);
        // condong maju sudah ditangani secara anatomis di tulang spine & chest.
        lean.rotation.x = isChibi ? .13 * effMove : 0;
        lean.rotation.z = clamp(-turnSmooth * (isChibi ? .06 : .038), -.18, .18) + Math.sin(phase) * (isChibi ? .035 : .02) * effMove;

        // update matrixWorld seluruh hierarki P sebelum fisika dada, rambut & pakaian MMD
        if (mmdExtra) {
            P.updateMatrixWorld(true);
            updateMmdExtras(mmdExtra, dt, t, speed, phase, effMove, turnSmooth, body.position.y, face);
        }

        // bayangan kontak mengecil halus saat melompat
        const shScale = Math.max(.68, 1 - body.position.y * .22);
        sh.scale.setScalar(shScale);
    };

    // warna pemain (dipakai mode kelas)
    window.setPlayerColor = hex => {
        aura.material.color.set(hex);
        auraOuter.material.color.set(hex);
        motes.material.color.set(hex);
        core.material.color.set(hex); core.material.emissive.set(hex);
    };

    // ---------- avatar pemain lain (mode kelas) ----------
    window.charPeer = color => {
        if (!ready || !tpl || !T.SkeletonUtils) return null;
        const root = T.SkeletonUtils.clone(tpl);
        root.scale.copy(tpl.scale); root.rotation.copy(tpl.rotation); root.position.copy(tpl.position);
        const holder = new T.Group(); holder.add(root);
        const rg = new T.Mesh(new T.TorusGeometry(1.38, .055, 8, 40), new T.MeshBasicMaterial({ color, transparent: true, opacity: .5, depthWrite: false, blending: T.AdditiveBlending }));
        rg.rotation.x = -Math.PI / 2; rg.position.y = .07; holder.add(rg);
        const bones = rigInfo(root, rig), lean2 = new T.Group();
        const peerExtra = loadedChar && loadedChar.type === 'mmd' ? setupMmdExtras(root, bones) : null;
        holder.remove(root); lean2.add(root); holder.add(lean2);
        const baseY = root.position.y;
        const st = { phase: Math.random() * 6, face: 0, faceT: 0, turn: 0, mv: 0 };
        return {
            obj: holder,
            update(dt, t, speed, vx, vz) {
                const isChibiPeer = !loadedChar || loadedChar.type !== 'mmd';
                const tm = Math.min(1, speed / 6);
                st.mv += (tm - st.mv) * (1 - Math.exp(-dt * 9));
                st.phase += dt * (isChibiPeer ? (2.2 + speed * 1.2) : (1.2 + speed * .86));
                if (speed > .35) st.faceT = Math.atan2(vx, vz);
                let d = st.faceT - st.face; d = ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
                const stT = d * (1 - Math.exp(-dt * 8)); st.face += stT;
                const tr = clamp(stT / Math.max(dt, .001), -5, 5);
                st.turn += (tr - st.turn) * (1 - Math.exp(-dt * 7));
                applyFullPose(bones, t, st.phase, st.mv, st.turn, 0, isChibiPeer);
                const peerBounce = isChibiPeer
                    ? (-Math.sin(st.phase * 2) * .10 - .02) * st.mv + Math.sin(t * 2.1 + st.phase) * .03 * (1 - st.mv)
                    : (-Math.sin(st.phase * 2) * .10 - .04) * st.mv;
                root.position.y = baseY + peerBounce;
                lean2.rotation.x = isChibiPeer ? .12 * st.mv : 0;
                lean2.rotation.z = clamp(-st.turn * (isChibiPeer ? .05 : .04), -.2, .2) + Math.sin(st.phase) * (isChibiPeer ? .03 : .02) * st.mv;
                holder.rotation.y = st.face;
                if (peerExtra) {
                    holder.updateMatrixWorld(true);
                    updateMmdExtras(peerExtra, dt, t, speed, st.phase, st.mv, st.turn, root.position.y, st.face);
                }
                rg.material.opacity = .4 + Math.sin(t * 2.4 + st.phase) * .12;
            }
        };
    };
})();
