// Input data: bisa paste langsung tanpa koma, tiap angka di baris baru
const rawData = `
15.2
15.2
15.2
15.2
15.2
35.7
35.7
35.7
35.7
35.7
83.3
83.3
83.3
83.3
83.3
156
156
156
156
156
142
142
142
142
142
63.6
63.6
63.6
63.6
63.6
`;

// Konversi menjadi array angka
const data = rawData.trim().split("\n").map(Number);

// Atur jumlah interval
const intervalCount = 5;
const intervalSize = Math.ceil(data.length / intervalCount);

for (let i = 0; i < intervalCount; i++) {
    const start = i * intervalSize;
    const end = start + intervalSize;
    const intervalData = data.slice(start, end);

    // Hitung rata-rata
    const sum = intervalData.reduce((acc, val) => acc + val, 0);
    const average = sum / intervalData.length;

    console.log(`Interval ${i + 1} (data ${start + 1}–${Math.min(end, data.length)}): ${intervalData.join(", ")}`);
    console.log(`Rata-rata = ${sum} / ${intervalData.length} ≈ ${average.toFixed(2)}\n`);
}