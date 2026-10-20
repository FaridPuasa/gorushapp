// Area lookup: postal code (primary) + address keyword matching (fallback).
// Source for postal code -> area/kampong data: https://brn.postcodebase.com/
// (scraped 2026-10-02, 373 unique Brunei postcodes). Area codes (B, G, JT,
// TUTONG, KB, KB / SERIA, LUMUT, SERIA, TEMBURONG) are unchanged - this only
// adds postcode-first lookup and typo-tolerant address matching on top of
// the existing keyword logic.

// postcode (no spaces, upper-cased) -> area code
const POSTCODE_AREA_MAP = {
    "BS8610": "G",
    "BS8211": "G",
    "BS8810": "G",
    "BS8510": "G",
    "BS8410": "G",
    "BS8811": "G",
    "BS8611": "G",
    "BS8711": "G",
    "BS8110": "G",
    "BS8710": "G",
    "BS8111": "G",
    "BB3510": "B",
    "BB3910": "B",
    "BB2513": "B",
    "BC3715": "B",
    "BC3515": "B",
    "BC3615": "B",
    "BC1515": "B",
    "BC3915": "B",
    "BC4115": "B",
    "BC2115": "B",
    "BC1715": "B",
    "BC3315": "B",
    "BC2315": "B",
    "BC2515": "B",
    "BC2715": "B",
    "BC2915": "B",
    "BC3115": "B",
    "BC1115": "B",
    "BM1126": "B",
    "BM1326": "B",
    "BM1526": "B",
    "BM1726": "B",
    "BM2526": "B",
    "BM2326": "B",
    "BM2726": "B",
    "BM1926": "KB",
    "BM2126": "KB",
    "BE2110": "G",
    "BE1310": "G",
    "BE1110": "G",
    "BE3519": "G",
    "BE1118": "G",
    "BE2719": "G",
    "BE2919": "G",
    "BE2319": "G",
    "BE1318": "G",
    "BE1518": "G",
    "BE1718": "G",
    "BE3919": "G",
    "BE4119": "G",
    "BE3719": "G",
    "BE3119": "G",
    "BE2119": "G",
    "BE3619": "G",
    "BE1918": "G",
    "BA1710": "G",
    "BA1712": "G",
    "BA2110": "G",
    "BA1910": "G",
    "BA1000": "G",
    "BA2711": "B",
    "BA2511": "LUMUT",
    "BA1111": "G",
    "BA1311": "G",
    "BA1511": "G",
    "BA1912": "JT",
    "BA1711": "G",
    "BA2312": "JT",
    "BA2112": "G",
    "BF1920": "JT",
    "BF1320": "JT",
    "BF1720": "JT",
    "BF2320": "JT",
    "BF2720": "JT",
    "BF2520": "JT",
    "BF1120": "JT",
    "BF2120": "JT",
    "BF2920": "JT",
    "BF1520": "JT",
    "BD1510": "B",
    "BD2917": "B",
    "BD3717": "KB / SERIA",
    "BD3917": "B",
    "BD1717": "B",
    "BD1517": "B",
    "BD4317": "B",
    "BD2317": "B",
    "BD3517": "B",
    "BD4517": "JT",
    "BD4117": "B",
    "BD2117": "B",
    "BD2717": "B",
    "BD2517": "B",
    "BD3317": "B",
    "BD1917": "B",
    "BD3117": "B",
    "BD2710": "B",
    "BD1310": "B",
    "BJ2924": "JT",
    "BJ1924": "JT",
    "BJ2324": "JT",
    "BJ1724": "JT",
    "BJ3324": "JT",
    "BJ1124": "TUTONG",
    "BJ3524": "JT",
    "BJ2524": "JT",
    "BJ1524": "JT",
    "BJ1324": "JT",
    "BJ2124": "KB / SERIA",
    "BU1529": "B",
    "BU1929": "B",
    "BU1729": "B",
    "BU2329": "B",
    "BU2529": "B",
    "BU1429": "B",
    "BU1229": "B",
    "BU1329": "B",
    "BU1129": "B",
    "BU2129": "B",
    "BH1523": "JT",
    "BH2923": "JT",
    "BH1323": "JT",
    "BH3223": "JT",
    "BH3323": "JT",
    "BH1723": "JT",
    "BH2123": "JT",
    "BH1923": "JT",
    "BH2323": "JT",
    "BH2723": "JT",
    "BH3123": "JT",
    "BH1123": "JT",
    "BH2523": "JT",
    "BP2326": "B",
    "BP1726": "B",
    "BP1926": "B",
    "BP2126": "B",
    "BP1326": "B",
    "BP1126": "B",
    "BP1526": "B",
    "BR1326": "B",
    "BR1526": "B",
    "BR1126": "B",
    "BR1926": "KB / SERIA",
    "BR1726": "B",
    "BG3122": "JT",
    "BG3322": "JT",
    "BG2721": "JT",
    "BG2521": "JT",
    "BG2921": "JT",
    "BG2121": "JT",
    "BG1221": "JT",
    "BG1721": "JT",
    "BG1121": "JT",
    "BG1321": "JT",
    "BG1921": "JT",
    "BG1521": "JT",
    "BG2321": "JT",
    "BG3110": "JT",
    "BT1728": "B",
    "BT2928": "B",
    "BT2328": "B",
    "BT1928": "B",
    "BT2728": "B",
    "BT1328": "B",
    "BT3528": "B",
    "BT3128": "KB / SERIA",
    "BT3328": "B",
    "BT2128": "B",
    "BT1528": "B",
    "BT1128": "B",
    "BK1125": "G",
    "BK1325": "G",
    "BK1525": "G",
    "BK1725": "G",
    "BK2325": "G",
    "BK1925": "G",
    "BK2125": "G",
    "BN1311": "G",
    "BN2111": "G",
    "BN2311": "G",
    "BN1111": "TEMBURONG",
    "BN1711": "G",
    "BN1511": "G",
    "BN1911": "G",
    "BL1512": "B",
    "BL1312": "B",
    "BL1712": "B",
    "BL1912": "B",
    "BL2112": "KB / SERIA",
    "BL2312": "TEMBURONG",
    "BL1112": "B",
    "KF4138": "KB / SERIA",
    "KF4338": "KB / SERIA",
    "KF1338": "KB / SERIA",
    "KF2138": "KB / SERIA",
    "KF1738": "KB / SERIA",
    "KF2738": "KB / SERIA",
    "KF2538": "KB / SERIA",
    "KF2338": "LUMUT",
    "KF3538": "KB / SERIA",
    "KF3338": "KB / SERIA",
    "KF3138": "KB / SERIA",
    "KF3938": "KB / SERIA",
    "KF4738": "TUTONG",
    "KF4538": "KB / SERIA",
    "KF2938": "KB / SERIA",
    "KF1138": "TUTONG",
    "KF1538": "KB / SERIA",
    "KF3738": "KB / SERIA",
    "KF1938": "KB / SERIA",
    "TB2141": "TUTONG",
    "TB1341": "TUTONG",
    "TB3341": "TUTONG",
    "TB2541": "TEMBURONG",
    "TB1141": "TUTONG",
    "TB2941": "TUTONG",
    "TB1541": "TUTONG",
    "TB3141": "TUTONG",
    "TB1941": "B",
    "TB2341": "TUTONG",
    "TB1741": "TUTONG",
    "TB2741": "TUTONG",
    "TE1143": "TUTONG",
    "TE2543": "TUTONG",
    "TE2143": "TUTONG",
    "TE2743": "TUTONG",
    "TE1543": "TUTONG",
    "TE2343": "TUTONG",
    "TE1743": "TUTONG",
    "TE1943": "TUTONG",
    "TE1343": "TUTONG",
    "TG1743": "TUTONG",
    "TG2943": "TUTONG",
    "TG3343": "TUTONG",
    "TG2743": "TUTONG",
    "TG1343": "KB / SERIA",
    "TG2343": "TUTONG",
    "TG1143": "TUTONG",
    "TG3143": "TUTONG",
    "TG1943": "TUTONG",
    "TG1543": "TUTONG",
    "TG2543": "TUTONG",
    "TG2143": "TUTONG",
    "TA3141": "TUTONG",
    "TA1341": "TUTONG",
    "TA1141": "TUTONG",
    "TA3341": "TUTONG",
    "TA2141": "TUTONG",
    "TA1941": "TUTONG",
    "TA3541": "TUTONG",
    "TA2741": "TUTONG",
    "TA2341": "TUTONG",
    "TA2541": "KB / SERIA",
    "TA1541": "TUTONG",
    "TA1741": "TUTONG",
    "TA2941": "TUTONG",
    "TH1949": "TUTONG",
    "TH3949": "TUTONG",
    "TH2749": "TEMBURONG",
    "TH4149": "TUTONG",
    "TH1749": "TUTONG",
    "TH2549": "TUTONG",
    "TH1549": "TUTONG",
    "TH3749": "TUTONG",
    "TH2949": "TUTONG",
    "TH1349": "TUTONG",
    "TH2349": "TUTONG",
    "TH1149": "TUTONG",
    "TH2149": "TUTONG",
    "TH3149": "TUTONG",
    "TH3549": "TUTONG",
    "TH3349": "TUTONG",
    "TD1541": "KB / SERIA",
    "TD2341": "TUTONG",
    "TD2541": "TUTONG",
    "TD1741": "TUTONG",
    "TD1341": "TUTONG",
    "TD1941": "B",
    "TD1141": "TUTONG",
    "TC3145": "TUTONG",
    "TC2345": "TUTONG",
    "TC2745": "TUTONG",
    "TC1745": "LUMUT",
    "TC2545": "TUTONG",
    "TC2145": "TUTONG",
    "TC1945": "B",
    "TC1545": "TUTONG",
    "TC1145": "TUTONG",
    "TC2945": "KB / SERIA",
    "TC3345": "TUTONG",
    "TC1345": "TUTONG",
    "TF4547": "KB / SERIA",
    "TF4147": "KB / SERIA",
    "TF2547": "KB / SERIA",
    "TF3147": "TUTONG",
    "TF4347": "TUTONG",
    "TF4747": "TUTONG",
    "TF3747": "TUTONG",
    "TF1947": "TUTONG",
    "TF2947": "TUTONG",
    "TF2747": "TUTONG",
    "TF1547": "TUTONG",
    "TF3947": "TUTONG",
    "TF3347": "TUTONG",
    "TF1347": "TUTONG",
    "TF2347": "KB / SERIA",
    "TF2147": "KB / SERIA",
    "TF3547": "TUTONG",
    "TF1747": "TUTONG",
    "TF1147": "TUTONG",
    "KD1132": "KB",
    "KD1332": "KB / SERIA",
    "KD1532": "KB / SERIA",
    "KA1131": "KB",
    "KA2331": "KB / SERIA",
    "KA1331": "KB / SERIA",
    "KA1731": "KB",
    "KA1531": "KB",
    "KA1931": "KB",
    "KA2731": "KB",
    "KA3131": "KB / SERIA",
    "KA3331": "KB",
    "KA2931": "KB",
    "KA2131": "KB",
    "KA3531": "KB",
    "KE1137": "KB / SERIA",
    "KE2537": "KB / SERIA",
    "KE2737": "KB / SERIA",
    "KE1537": "KB / SERIA",
    "KE3537": "KB / SERIA",
    "KE3737": "KB / SERIA",
    "KE2937": "KB / SERIA",
    "KE3337": "KB / SERIA",
    "KE2137": "KB / SERIA",
    "KE1337": "LUMUT",
    "KE3137": "LUMUT",
    "KE1937": "LUMUT",
    "KE3937": "KB / SERIA",
    "KE2337": "KB / SERIA",
    "KE1737": "LUMUT",
    "KC1535": "LUMUT",
    "KC1335": "LUMUT",
    "KC1735": "KB / SERIA",
    "KC2335": "LUMUT",
    "KC2535": "KB / SERIA",
    "KC2135": "TUTONG",
    "KC1935": "LUMUT",
    "KC1135": "LUMUT",
    "KC2735": "LUMUT",
    "KC3135": "LUMUT",
    "KC2935": "LUMUT",
    "KH1539": "KB / SERIA",
    "KH1339": "KB / SERIA",
    "KH1139": "KB / SERIA",
    "KB2333": "LUMUT",
    "KB3933": "KB / SERIA",
    "KB2133": "SERIA",
    "KB1333": "SERIA",
    "KB2733": "SERIA",
    "KB1133": "KB / SERIA",
    "KB1733": "SERIA",
    "KB2533": "SERIA",
    "KB1933": "KB / SERIA",
    "KB4333": "SERIA",
    "KB2933": "SERIA",
    "KB3133": "SERIA",
    "KB3333": "SERIA",
    "KB3533": "SERIA",
    "KB3733": "SERIA",
    "KB4533": "SERIA",
    "KB1533": "SERIA",
    "KB4133": "SERIA"
};

// Same (keyword, area) pairs the address-matching logic below checks, in the
// same priority order (first match wins) - reused by the fuzzy/typo-tolerant
// fallback so it can never produce an area the exact matcher wouldn't.
const KAMPONG_AREA_RULES = [
    {
        "keyword": "MANGGIS",
        "area": "B"
    },
    {
        "keyword": "DELIMA",
        "area": "B"
    },
    {
        "keyword": "ANGGREK DESA",
        "area": "B"
    },
    {
        "keyword": "ANGGREK",
        "area": "B"
    },
    {
        "keyword": "JAYA SETIA",
        "area": "B"
    },
    {
        "keyword": "PULAIE",
        "area": "B"
    },
    {
        "keyword": "LAMBAK",
        "area": "B"
    },
    {
        "keyword": "TERUNJING",
        "area": "B"
    },
    {
        "keyword": "MADANG",
        "area": "B"
    },
    {
        "keyword": "AIRPORT",
        "area": "B"
    },
    {
        "keyword": "ORANG KAYA BESAR IMAS",
        "area": "B"
    },
    {
        "keyword": "OKBI",
        "area": "B"
    },
    {
        "keyword": "SERUSOP",
        "area": "B"
    },
    {
        "keyword": "BURONG PINGAI",
        "area": "B"
    },
    {
        "keyword": "SETIA NEGARA",
        "area": "B"
    },
    {
        "keyword": "PASIR BERAKAS",
        "area": "B"
    },
    {
        "keyword": "MENTERI BESAR",
        "area": "B"
    },
    {
        "keyword": "KEBANGSAAN LAMA",
        "area": "B"
    },
    {
        "keyword": "BATU MARANG",
        "area": "B"
    },
    {
        "keyword": "DATO GANDI",
        "area": "B"
    },
    {
        "keyword": "KAPOK",
        "area": "B"
    },
    {
        "keyword": "KOTA BATU",
        "area": "B"
    },
    {
        "keyword": "MENTIRI",
        "area": "B"
    },
    {
        "keyword": "MERAGANG",
        "area": "B"
    },
    {
        "keyword": "PELAMBAIAN",
        "area": "B"
    },
    {
        "keyword": "PINTU MALIM",
        "area": "B"
    },
    {
        "keyword": "SALAMBIGAR",
        "area": "B"
    },
    {
        "keyword": "SALAR",
        "area": "B"
    },
    {
        "keyword": "SERASA",
        "area": "B"
    },
    {
        "keyword": "SERDANG",
        "area": "B"
    },
    {
        "keyword": "SUNGAI BASAR",
        "area": "B"
    },
    {
        "keyword": "SG BASAR",
        "area": "B"
    },
    {
        "keyword": "SUNGAI BELUKUT",
        "area": "B"
    },
    {
        "keyword": "SG BELUKUT",
        "area": "B"
    },
    {
        "keyword": "SUNGAI HANCHING",
        "area": "B"
    },
    {
        "keyword": "SG HANCHING",
        "area": "B"
    },
    {
        "keyword": "SUNGAI TILONG",
        "area": "B"
    },
    {
        "keyword": "SG TILONG",
        "area": "B"
    },
    {
        "keyword": "SUBOK",
        "area": "B"
    },
    {
        "keyword": "SUNGAI AKAR",
        "area": "B"
    },
    {
        "keyword": "SG AKAR",
        "area": "B"
    },
    {
        "keyword": "SUNGAI BULOH",
        "area": "B"
    },
    {
        "keyword": "SG BULOH",
        "area": "B"
    },
    {
        "keyword": "TANAH JAMBU",
        "area": "B"
    },
    {
        "keyword": "SUNGAI OROK",
        "area": "B"
    },
    {
        "keyword": "SG OROK",
        "area": "B"
    },
    {
        "keyword": "KATOK",
        "area": "G"
    },
    {
        "keyword": "MATA-MATA",
        "area": "G"
    },
    {
        "keyword": "MATA MATA",
        "area": "G"
    },
    {
        "keyword": "RIMBA",
        "area": "G"
    },
    {
        "keyword": "TUNGKU",
        "area": "G"
    },
    {
        "keyword": "UBD",
        "area": "G"
    },
    {
        "keyword": "UNIVERSITI BRUNEI DARUSSALAM",
        "area": "G"
    },
    {
        "keyword": "JIS",
        "area": "G"
    },
    {
        "keyword": "JERUDONG INTERNATIONAL SCHOOL",
        "area": "G"
    },
    {
        "keyword": "BERANGAN",
        "area": "G"
    },
    {
        "keyword": "BERIBI",
        "area": "G"
    },
    {
        "keyword": "KIULAP",
        "area": "G"
    },
    {
        "keyword": "RIPAS",
        "area": "G"
    },
    {
        "keyword": "RAJA ISTERI PENGIRAN ANAK SALLEHA",
        "area": "G"
    },
    {
        "keyword": "KIARONG",
        "area": "G"
    },
    {
        "keyword": "PUSAR ULAK",
        "area": "G"
    },
    {
        "keyword": "KUMBANG PASANG",
        "area": "G"
    },
    {
        "keyword": "MENGLAIT",
        "area": "G"
    },
    {
        "keyword": "MABOHAI",
        "area": "G"
    },
    {
        "keyword": "ONG SUM PING",
        "area": "G"
    },
    {
        "keyword": "GADONG",
        "area": "G"
    },
    {
        "keyword": "TASEK LAMA",
        "area": "G"
    },
    {
        "keyword": "BANDAR TOWN",
        "area": "G"
    },
    {
        "keyword": "BATU SATU",
        "area": "JT"
    },
    {
        "keyword": "BENGKURONG",
        "area": "JT"
    },
    {
        "keyword": "BUNUT",
        "area": "JT"
    },
    {
        "keyword": "JALAN BABU RAJA",
        "area": "JT"
    },
    {
        "keyword": "JALAN ISTANA",
        "area": "JT"
    },
    {
        "keyword": "JUNJONGAN",
        "area": "JT"
    },
    {
        "keyword": "KASAT",
        "area": "JT"
    },
    {
        "keyword": "LUMAPAS",
        "area": "JT"
    },
    {
        "keyword": "JALAN HALUS",
        "area": "JT"
    },
    {
        "keyword": "MADEWA",
        "area": "JT"
    },
    {
        "keyword": "PUTAT",
        "area": "JT"
    },
    {
        "keyword": "SINARUBAI",
        "area": "JT"
    },
    {
        "keyword": "TASEK MERADUN",
        "area": "JT"
    },
    {
        "keyword": "TELANAI",
        "area": "JT"
    },
    {
        "keyword": "BAN 1",
        "area": "JT"
    },
    {
        "keyword": "BAN 2",
        "area": "JT"
    },
    {
        "keyword": "BAN 3",
        "area": "JT"
    },
    {
        "keyword": "BAN 4",
        "area": "JT"
    },
    {
        "keyword": "BAN 5",
        "area": "JT"
    },
    {
        "keyword": "BAN 6",
        "area": "JT"
    },
    {
        "keyword": "BATONG",
        "area": "JT"
    },
    {
        "keyword": "BATU AMPAR",
        "area": "JT"
    },
    {
        "keyword": "BEBATIK",
        "area": "JT"
    },
    {
        "keyword": "BEBULOH",
        "area": "JT"
    },
    {
        "keyword": "BEBATIK KILANAS",
        "area": "JT"
    },
    {
        "keyword": "KILANAS",
        "area": "JT"
    },
    {
        "keyword": "DADAP",
        "area": "JT"
    },
    {
        "keyword": "KUALA LURAH",
        "area": "JT"
    },
    {
        "keyword": "KULAPIS",
        "area": "JT"
    },
    {
        "keyword": "LIMAU MANIS",
        "area": "JT"
    },
    {
        "keyword": "MASIN",
        "area": "JT"
    },
    {
        "keyword": "MULAUT",
        "area": "JT"
    },
    {
        "keyword": "PANCHOR MURAI",
        "area": "JT"
    },
    {
        "keyword": "PANCHUR MURAI",
        "area": "JT"
    },
    {
        "keyword": "PANGKALAN BATU",
        "area": "JT"
    },
    {
        "keyword": "PASAI",
        "area": "JT"
    },
    {
        "keyword": "WASAN",
        "area": "JT"
    },
    {
        "keyword": "PARIT",
        "area": "JT"
    },
    {
        "keyword": "EMPIRE",
        "area": "JT"
    },
    {
        "keyword": "JANGSAK",
        "area": "JT"
    },
    {
        "keyword": "JERUDONG",
        "area": "JT"
    },
    {
        "keyword": "KATIMAHAR",
        "area": "JT"
    },
    {
        "keyword": "LUGU",
        "area": "JT"
    },
    {
        "keyword": "SENGKURONG",
        "area": "JT"
    },
    {
        "keyword": "TANJONG NANGKA",
        "area": "JT"
    },
    {
        "keyword": "TANJONG BUNUT",
        "area": "JT"
    },
    {
        "keyword": "TANJUNG BUNUT",
        "area": "JT"
    },
    {
        "keyword": "SUNGAI TAMPOI",
        "area": "JT"
    },
    {
        "keyword": "SG TAMPOI",
        "area": "JT"
    },
    {
        "keyword": "MUARA",
        "area": "B"
    },
    {
        "keyword": "SENGKARAI",
        "area": "TUTONG"
    },
    {
        "keyword": "PANCHOR",
        "area": "TUTONG"
    },
    {
        "keyword": "PENABAI",
        "area": "TUTONG"
    },
    {
        "keyword": "KUALA TUTONG",
        "area": "TUTONG"
    },
    {
        "keyword": "PENANJONG",
        "area": "TUTONG"
    },
    {
        "keyword": "KERIAM",
        "area": "TUTONG"
    },
    {
        "keyword": "BUKIT PANGGAL",
        "area": "TUTONG"
    },
    {
        "keyword": "PANGGAL",
        "area": "TUTONG"
    },
    {
        "keyword": "LUAGAN",
        "area": "TUTONG"
    },
    {
        "keyword": "DUDOK",
        "area": "TUTONG"
    },
    {
        "keyword": "LUAGAN DUDOK",
        "area": "TUTONG"
    },
    {
        "keyword": "SINAUT",
        "area": "TUTONG"
    },
    {
        "keyword": "SUNGAI KELUGOS",
        "area": "TUTONG"
    },
    {
        "keyword": "KELUGOS",
        "area": "TUTONG"
    },
    {
        "keyword": "SG KELUGOS",
        "area": "TUTONG"
    },
    {
        "keyword": "KUPANG",
        "area": "TUTONG"
    },
    {
        "keyword": "KIUDANG",
        "area": "TUTONG"
    },
    {
        "keyword": "PAD",
        "area": "TUTONG"
    },
    {
        "keyword": "NUNOK",
        "area": "TUTONG"
    },
    {
        "keyword": "PAD NUNOK",
        "area": "TUTONG"
    },
    {
        "keyword": "BEKIAU",
        "area": "TUTONG"
    },
    {
        "keyword": "MAU",
        "area": "TUTONG"
    },
    {
        "keyword": "PENGKALAN MAU",
        "area": "TUTONG"
    },
    {
        "keyword": "BATANG MITUS",
        "area": "TUTONG"
    },
    {
        "keyword": "MITUS",
        "area": "TUTONG"
    },
    {
        "keyword": "KEBIA",
        "area": "TUTONG"
    },
    {
        "keyword": "BIRAU",
        "area": "TUTONG"
    },
    {
        "keyword": "LAMUNIN",
        "area": "TUTONG"
    },
    {
        "keyword": "LAYONG",
        "area": "TUTONG"
    },
    {
        "keyword": "MENENGAH",
        "area": "TUTONG"
    },
    {
        "keyword": "PANCHONG",
        "area": "TUTONG"
    },
    {
        "keyword": "PENAPAR",
        "area": "TUTONG"
    },
    {
        "keyword": "TANJONG MAYA",
        "area": "TUTONG"
    },
    {
        "keyword": "MAYA",
        "area": "TUTONG"
    },
    {
        "keyword": "LUBOK",
        "area": "TUTONG"
    },
    {
        "keyword": "PULAU",
        "area": "TUTONG"
    },
    {
        "keyword": "LUBOK PULAU",
        "area": "TUTONG"
    },
    {
        "keyword": "BUKIT UDAL",
        "area": "TUTONG"
    },
    {
        "keyword": "UDAL",
        "area": "TUTONG"
    },
    {
        "keyword": "RAMBAI",
        "area": "TUTONG"
    },
    {
        "keyword": "BENUTAN",
        "area": "TUTONG"
    },
    {
        "keyword": "MERIMBUN",
        "area": "TUTONG"
    },
    {
        "keyword": "UKONG",
        "area": "TUTONG"
    },
    {
        "keyword": "LONG",
        "area": "TUTONG"
    },
    {
        "keyword": "MAYAN",
        "area": "TUTONG"
    },
    {
        "keyword": "LONG MAYAN",
        "area": "TUTONG"
    },
    {
        "keyword": "TELISAI",
        "area": "TUTONG"
    },
    {
        "keyword": "DANAU",
        "area": "TUTONG"
    },
    {
        "keyword": "BUKIT BERUANG",
        "area": "TUTONG"
    },
    {
        "keyword": "BERUANG",
        "area": "TUTONG"
    },
    {
        "keyword": "TUTONG",
        "area": "TUTONG"
    },
    {
        "keyword": "AGIS",
        "area": "LUMUT"
    },
    {
        "keyword": "ANDALAU",
        "area": "LUMUT"
    },
    {
        "keyword": "ANDUKI",
        "area": "LUMUT"
    },
    {
        "keyword": "APAK",
        "area": "KB / SERIA"
    },
    {
        "keyword": "BADAS",
        "area": "LUMUT"
    },
    {
        "keyword": "BATANG DURI",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BANG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "GARANG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "PUKUL",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TAJUK",
        "area": "KB / SERIA"
    },
    {
        "keyword": "BENGERANG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "BIADONG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "ULU",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TENGAH",
        "area": "KB / SERIA"
    },
    {
        "keyword": "BISUT",
        "area": "KB / SERIA"
    },
    {
        "keyword": "BUAU",
        "area": "KB / SERIA"
    },
    {
        "keyword": "KANDOL",
        "area": "KB / SERIA"
    },
    {
        "keyword": "PUAN",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TUDING",
        "area": "LUMUT"
    },
    {
        "keyword": "SAWAT",
        "area": "KB / SERIA"
    },
    {
        "keyword": "SERAWONG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "CHINA",
        "area": "KB / SERIA"
    },
    {
        "keyword": "DUGUN",
        "area": "KB / SERIA"
    },
    {
        "keyword": "GATAS",
        "area": "KB / SERIA"
    },
    {
        "keyword": "JABANG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "KAGU",
        "area": "KB / SERIA"
    },
    {
        "keyword": "KAJITAN",
        "area": "KB / SERIA"
    },
    {
        "keyword": "KELUYOH",
        "area": "KB / SERIA"
    },
    {
        "keyword": "KENAPOL",
        "area": "KB / SERIA"
    },
    {
        "keyword": "KUALA BALAI",
        "area": "KB"
    },
    {
        "keyword": "BALAI",
        "area": "KB"
    },
    {
        "keyword": "KUALA BELAIT",
        "area": "KB"
    },
    {
        "keyword": "KUKUB",
        "area": "KB / SERIA"
    },
    {
        "keyword": "LABI",
        "area": "LUMUT"
    },
    {
        "keyword": "LAKANG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "LAONG ARUT",
        "area": "KB / SERIA"
    },
    {
        "keyword": "ARUT",
        "area": "KB / SERIA"
    },
    {
        "keyword": "LAONG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "LIANG",
        "area": "LUMUT"
    },
    {
        "keyword": "SUNGAI LIANG",
        "area": "LUMUT"
    },
    {
        "keyword": "SG LIANG",
        "area": "LUMUT"
    },
    {
        "keyword": "LUMUT",
        "area": "LUMUT"
    },
    {
        "keyword": "LORONG",
        "area": "SERIA"
    },
    {
        "keyword": "LORONG TENGAH",
        "area": "SERIA"
    },
    {
        "keyword": "LORONG TIGA SELATAN",
        "area": "SERIA"
    },
    {
        "keyword": "LILAS",
        "area": "KB / SERIA"
    },
    {
        "keyword": "LUBUK LANYAP",
        "area": "KB / SERIA"
    },
    {
        "keyword": "LANYAP",
        "area": "KB / SERIA"
    },
    {
        "keyword": "LUBUK TAPANG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TAPANG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MALA'AS",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MALAAS",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MALAYAN",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MELAYU",
        "area": "KB / SERIA"
    },
    {
        "keyword": "ASLI",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MELAYU ASLI",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MELILAS",
        "area": "LUMUT"
    },
    {
        "keyword": "MENDARAM",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MENDARAM BESAR",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MENDARAM KECIL",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MERANGKING",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MERANGKING ULU",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MERANGKING HILIR",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MUMONG",
        "area": "KB"
    },
    {
        "keyword": "PANDAN",
        "area": "KB"
    },
    {
        "keyword": "PADANG",
        "area": "KB"
    },
    {
        "keyword": "PANAGA",
        "area": "SERIA"
    },
    {
        "keyword": "PENGKALAN SIONG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "SIONG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "PENGALAYAN",
        "area": "KB / SERIA"
    },
    {
        "keyword": "PENYRAP",
        "area": "KB / SERIA"
    },
    {
        "keyword": "PERANGKONG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "PERUMPONG",
        "area": "LUMUT"
    },
    {
        "keyword": "PESILIN",
        "area": "KB / SERIA"
    },
    {
        "keyword": "PULAU APIL",
        "area": "KB / SERIA"
    },
    {
        "keyword": "APIL",
        "area": "KB / SERIA"
    },
    {
        "keyword": "RAMPAYOH",
        "area": "KB / SERIA"
    },
    {
        "keyword": "RATAN",
        "area": "KB / SERIA"
    },
    {
        "keyword": "SAUD",
        "area": "KB / SERIA"
    },
    {
        "keyword": "SIMPANG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "SIMPANG TIGA",
        "area": "LUMUT"
    },
    {
        "keyword": "SINGAP",
        "area": "KB / SERIA"
    },
    {
        "keyword": "SUKANG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "BAKONG",
        "area": "LUMUT"
    },
    {
        "keyword": "DAMIT",
        "area": "KB / SERIA"
    },
    {
        "keyword": "BERA",
        "area": "KB / SERIA"
    },
    {
        "keyword": "DUHON",
        "area": "KB / SERIA"
    },
    {
        "keyword": "GANA",
        "area": "LUMUT"
    },
    {
        "keyword": "HILIR",
        "area": "KB / SERIA"
    },
    {
        "keyword": "KANG",
        "area": "LUMUT"
    },
    {
        "keyword": "KURU",
        "area": "LUMUT"
    },
    {
        "keyword": "LALIT",
        "area": "LUMUT"
    },
    {
        "keyword": "LUTONG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MAU",
        "area": "KB / SERIA"
    },
    {
        "keyword": "MELILIT",
        "area": "KB / SERIA"
    },
    {
        "keyword": "PETAI",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TALI",
        "area": "LUMUT"
    },
    {
        "keyword": "TARING",
        "area": "LUMUT"
    },
    {
        "keyword": "TERABAN",
        "area": "KB"
    },
    {
        "keyword": "UBAR",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TANAJOR",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TANJONG RANGGAS",
        "area": "KB / SERIA"
    },
    {
        "keyword": "RANGGAS",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TANJONG SUDAI",
        "area": "KB / SERIA"
    },
    {
        "keyword": "SUDAI",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TAPANG LUPAK",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TARAP",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TEMPINAK",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TERAJA",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TERAWAN",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TERUNAN",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TUGONG",
        "area": "KB / SERIA"
    },
    {
        "keyword": "TUNGULLIAN",
        "area": "LUMUT"
    },
    {
        "keyword": "UBOK",
        "area": "KB / SERIA"
    },
    {
        "keyword": "BELAIT",
        "area": "KB / SERIA"
    },
    {
        "keyword": "SERIA",
        "area": "KB / SERIA"
    },
    {
        "keyword": "AMO",
        "area": "TEMBURONG"
    },
    {
        "keyword": "AYAM-AYAM",
        "area": "TEMBURONG"
    },
    {
        "keyword": "AYAM AYAM",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BAKARUT",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BATANG TUAU",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BATU APOI",
        "area": "TEMBURONG"
    },
    {
        "keyword": "APOI",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BATU BEJARAH",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BEJARAH",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BELABAN",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BELAIS",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BELINGOS",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BIANG",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BOKOK",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BUDA BUDA",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BUDA-BUDA",
        "area": "TEMBURONG"
    },
    {
        "keyword": "GADONG BARU",
        "area": "TEMBURONG"
    },
    {
        "keyword": "KENUA",
        "area": "TEMBURONG"
    },
    {
        "keyword": "LABU ESTATE",
        "area": "TEMBURONG"
    },
    {
        "keyword": "LABU",
        "area": "TEMBURONG"
    },
    {
        "keyword": "LAGAU",
        "area": "TEMBURONG"
    },
    {
        "keyword": "LAKIUN",
        "area": "TEMBURONG"
    },
    {
        "keyword": "LAMALING",
        "area": "TEMBURONG"
    },
    {
        "keyword": "LEPONG",
        "area": "TEMBURONG"
    },
    {
        "keyword": "LUAGAN",
        "area": "TEMBURONG"
    },
    {
        "keyword": "MANIUP",
        "area": "TEMBURONG"
    },
    {
        "keyword": "MENENGAH",
        "area": "TEMBURONG"
    },
    {
        "keyword": "NEGALANG",
        "area": "TEMBURONG"
    },
    {
        "keyword": "NEGALANG ERING",
        "area": "TEMBURONG"
    },
    {
        "keyword": "NEGALANG UNAT",
        "area": "TEMBURONG"
    },
    {
        "keyword": "PARIT",
        "area": "TEMBURONG"
    },
    {
        "keyword": "PARIT BELAYANG",
        "area": "TEMBURONG"
    },
    {
        "keyword": "PAYAU",
        "area": "TEMBURONG"
    },
    {
        "keyword": "PELIUNAN",
        "area": "TEMBURONG"
    },
    {
        "keyword": "PERDAYAN",
        "area": "TEMBURONG"
    },
    {
        "keyword": "PIASAU-PIASAU",
        "area": "TEMBURONG"
    },
    {
        "keyword": "PIASAU PIASAU",
        "area": "TEMBURONG"
    },
    {
        "keyword": "PIUNGAN",
        "area": "TEMBURONG"
    },
    {
        "keyword": "PUNI",
        "area": "TEMBURONG"
    },
    {
        "keyword": "RATAIE",
        "area": "TEMBURONG"
    },
    {
        "keyword": "REBADA",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SEKUROP",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SELANGAN",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SELAPON",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SEMABAT",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SEMAMAMNG",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SENUKOH",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SERI TANJONG BELAYANG",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BELAYANG",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SIBULU",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SIBUT",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SIMBATANG BATU APOI",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SIMBATANG BOKOK",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SUBOK",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SUMBILING",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SUMBILING BARU",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SUMBILING LAMA",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SUNGAI RADANG",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SG RADANG",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SUNGAI SULOK",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SG SULOK ",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SUNGAI TANAM",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SG TANAM",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SUNGAI TANIT",
        "area": "TEMBURONG"
    },
    {
        "keyword": "SG TANIT",
        "area": "TEMBURONG"
    },
    {
        "keyword": "TANJONG BUNGAR",
        "area": "TEMBURONG"
    },
    {
        "keyword": "TEMADA",
        "area": "TEMBURONG"
    },
    {
        "keyword": "UJONG JALAN",
        "area": "TEMBURONG"
    },
    {
        "keyword": "BANGAR",
        "area": "TEMBURONG"
    },
    {
        "keyword": "TEMBURONG",
        "area": "TEMBURONG"
    }
];

function normalizePostalCode(postalCode) {
    if (!postalCode) return '';
    return String(postalCode).toUpperCase().replace(/s+/g, '').trim();
}

// Direct postcode -> area lookup. Returns null (not 'N/A') when the postcode
// is missing/unrecognized, so callers can tell "no match" apart from "this
// postcode genuinely has no area" (which doesn't happen in the map).
function getAreaFromPostcode(postalCode) {
    const normalized = normalizePostalCode(postalCode);
    if (!normalized) return null;
    return POSTCODE_AREA_MAP[normalized] || null;
}

// Word-bounded substring match - plain .includes() let keywords match inside
// unrelated words (found 2026-10-07: "TALI", a real Brunei kampong, matched
// inside "PETALING" - Petaling Jaya, Malaysia - via plain substring search,
// mis-tagging a Malaysian MGLOBAL address with a Brunei area code). Boundary
// is "not a letter/digit on either side" rather than regex \b, since \b
// treats the already-uppercased address's letters/digits identically either
// way and this reads clearer next to the keyword's own escaping.
function hasWord(upperHaystack, keyword) {
    const escaped = keyword
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/ /g, '\\s+');
    return new RegExp(`(?<![A-Z0-9])${escaped}(?![A-Z0-9])`).test(upperHaystack);
}

// "Jalan Tutong"/"Jln Tutong" (and "Jalan Seria/Tutong") is a road name that
// runs through Brunei-Muara and Belait - it doesn't mean the address is
// actually in Tutong district (found 2026-10-20: "Istana Nurul Iman Jalan
// Tutong", the palace in Bandar, was resolving to TUTONG on this alone).
// Strip those road-name mentions before checking for a genuine standalone
// "Tutong" district reference.
function hasWordAsDistrict(upperAddress, keyword) {
    const stripped = upperAddress.replace(/(JALAN|JLN)\s*(SERIA\s*\/\s*)?TUTONG/g, ' ');
    return hasWord(stripped, keyword);
}

function getAreaFromAddress(address) {
    if (!address) return 'N/A';

    const upperAddress = address.toUpperCase();
    let area = 'N/A';
    let kampong = '';

    if (hasWord(upperAddress, "MANGGIS") == true) { area = "B", kampong = "MANGGIS" }
    else if (hasWord(upperAddress, "DELIMA") == true) { area = "B", kampong = "DELIMA" }
    else if (hasWord(upperAddress, "ANGGREK DESA") == true) { area = "B", kampong = "ANGGREK DESA" }
    else if (hasWord(upperAddress, "ANGGREK") == true) { area = "B", kampong = "ANGGREK DESA" }
    else if (hasWord(upperAddress, "PULAIE") == true) { area = "B", kampong = "PULAIE" }
    else if (hasWord(upperAddress, "LAMBAK") == true) { area = "B", kampong = "LAMBAK" }
    else if (hasWord(upperAddress, "TERUNJING") == true) { area = "B", kampong = "TERUNJING" }
    else if (hasWord(upperAddress, "MADANG") == true) { area = "B", kampong = "MADANG" }
    else if (hasWord(upperAddress, "AIRPORT") == true) { area = "B", kampong = "AIRPORT" }
    else if (hasWord(upperAddress, "ORANG KAYA BESAR IMAS") == true) { area = "B", kampong = "OKBI" }
    else if (hasWord(upperAddress, "OKBI") == true) { area = "B", kampong = "OKBI" }
    else if (hasWord(upperAddress, "SERUSOP") == true) { area = "B", kampong = "SERUSOP" }
    else if (hasWord(upperAddress, "BURONG PINGAI") == true) { area = "B", kampong = "BURONG PINGAI" }
    else if (hasWord(upperAddress, "SETIA NEGARA") == true) { area = "B", kampong = "SETIA NEGARA" }
    else if (hasWord(upperAddress, "PASIR BERAKAS") == true) { area = "B", kampong = "PASIR BERAKAS" }
    else if (hasWord(upperAddress, "MENTERI BESAR") == true) { area = "B", kampong = "MENTERI BESAR" }
    else if (hasWord(upperAddress, "KEBANGSAAN LAMA") == true) { area = "B", kampong = "KEBANGSAAN LAMA" }
    else if (hasWord(upperAddress, "BATU MARANG") == true) { area = "B", kampong = "BATU MARANG" }
    else if (hasWord(upperAddress, "DATO GANDI") == true) { area = "B", kampong = "DATO GANDI" }
    else if (hasWord(upperAddress, "KAPOK") == true) { area = "B", kampong = "KAPOK" }
    else if (hasWord(upperAddress, "KOTA BATU") == true) { area = "B", kampong = "KOTA BATU" }
    else if (hasWord(upperAddress, "MENTIRI") == true) { area = "B", kampong = "MENTIRI" }
    else if (hasWord(upperAddress, "MERAGANG") == true) { area = "B", kampong = "MERAGANG" }
    else if (hasWord(upperAddress, "PELAMBAIAN") == true) { area = "B", kampong = "PELAMBAIAN" }
    else if (hasWord(upperAddress, "PINTU MALIM") == true) { area = "B", kampong = "PINTU MALIM" }
    else if (hasWord(upperAddress, "SALAMBIGAR") == true) { area = "B", kampong = "SALAMBIGAR" }
    else if (hasWord(upperAddress, "SALAR") == true) { area = "B", kampong = "SALAR" }
    else if (hasWord(upperAddress, "SERASA") == true) { area = "B", kampong = "SERASA" }
    else if (hasWord(upperAddress, "SERDANG") == true) { area = "B", kampong = "SERDANG" }
    else if (hasWord(upperAddress, "SUNGAI BASAR") == true) { area = "B", kampong = "SUNGAI BASAR" }
    else if (hasWord(upperAddress, "SG BASAR") == true) { area = "B", kampong = "SUNGAI BASAR" }
    else if (hasWord(upperAddress, "SUNGAI BELUKUT") == true) { area = "B", kampong = "SUNGAI BELUKUT" }
    else if (hasWord(upperAddress, "SG BELUKUT") == true) { area = "B", kampong = "SUNGAI BELUKUT" }
    else if (hasWord(upperAddress, "SUNGAI HANCHING") == true) { area = "B", kampong = "SUNGAI HANCHING" }
    else if (hasWord(upperAddress, "SG HANCHING") == true) { area = "B", kampong = "SUNGAI HANCHING" }
    else if (hasWord(upperAddress, "SUNGAI TILONG") == true) { area = "B", kampong = "SUNGAI TILONG" }
    else if (hasWord(upperAddress, "SG TILONG") == true) { area = "B", kampong = "SUNGAI TILONG" }
    else if (hasWord(upperAddress, "SUBOK") == true) { area = "B", kampong = "SUBOK" }
    else if (hasWord(upperAddress, "SUNGAI AKAR") == true) { area = "B", kampong = "SUNGAI AKAR" }
    else if (hasWord(upperAddress, "SG AKAR") == true) { area = "B", kampong = "SUNGAI AKAR" }
    else if (hasWord(upperAddress, "SUNGAI BULOH") == true) { area = "B", kampong = "SUNGAI BULOH" }
    else if (hasWord(upperAddress, "SG BULOH") == true) { area = "B", kampong = "SUNGAI BULOH" }
    else if (hasWord(upperAddress, "TANAH JAMBU") == true) { area = "B", kampong = "TANAH JAMBU" }
    else if (hasWord(upperAddress, "SUNGAI OROK") == true) { area = "B", kampong = "SUNGAI OROK" }
    else if (hasWord(upperAddress, "SG OROK") == true) { area = "B", kampong = "SUNGAI OROK" }
    else if (hasWord(upperAddress, "KATOK") == true) { area = "G", kampong = "KATOK" }
    else if (hasWord(upperAddress, "MATA-MATA") == true) { area = "G", kampong = "MATA-MATA" }
    else if (hasWord(upperAddress, "MATA MATA") == true) { area = "G", kampong = "MATA-MATA" }
    else if (hasWord(upperAddress, "RIMBA") == true) { area = "G", kampong = "RIMBA" }
    else if (hasWord(upperAddress, "TUNGKU") == true) { area = "G", kampong = "TUNGKU" }
    else if (hasWord(upperAddress, "UBD") == true) { area = "G", kampong = "UBD" }
    else if (hasWord(upperAddress, "UNIVERSITI BRUNEI DARUSSALAM") == true) { area = "G", kampong = "UBD" }
    else if (hasWord(upperAddress, "JIS") == true) { area = "G" }
    else if (hasWord(upperAddress, "JERUDONG INTERNATIONAL SCHOOL") == true) { area = "G", kampong = "JIS" }
    else if (hasWord(upperAddress, "BERANGAN") == true) { area = "G", kampong = "BERANGAN" }
    else if (hasWord(upperAddress, "BERIBI") == true) { area = "G", kampong = "BERIBI" }
    else if (hasWord(upperAddress, "KIULAP") == true) { area = "G", kampong = "KIULAP" }
    else if (hasWord(upperAddress, "RIPAS") == true) { area = "G", kampong = "RIPAS" }
    else if (hasWord(upperAddress, "RAJA ISTERI PENGIRAN ANAK SALLEHA") == true) { area = "G", kampong = "RIPAS" }
    else if (hasWord(upperAddress, "KIARONG") == true) { area = "G", kampong = "KIARONG" }
    else if (hasWord(upperAddress, "PUSAR ULAK") == true) { area = "G", kampong = "PUSAR ULAK" }
    else if (hasWord(upperAddress, "KUMBANG PASANG") == true) { area = "G", kampong = "KUMBANG PASANG" }
    else if (hasWord(upperAddress, "MENGLAIT") == true) { area = "G", kampong = "MENGLAIT" }
    else if (hasWord(upperAddress, "MABOHAI") == true) { area = "G", kampong = "MABOHAI" }
    else if (hasWord(upperAddress, "ONG SUM PING") == true) { area = "G", kampong = "ONG SUM PING" }
    else if (hasWord(upperAddress, "GADONG") == true) { area = "G", kampong = "GADONG" }
    else if (hasWord(upperAddress, "TASEK LAMA") == true) { area = "G", kampong = "TASEK LAMA" }
    else if (hasWord(upperAddress, "BANDAR TOWN") == true) { area = "G", kampong = "BANDAR TOWN" }
    else if (hasWord(upperAddress, "BATU SATU") == true) { area = "JT", kampong = "BATU SATU" }
    else if (hasWord(upperAddress, "BENGKURONG") == true) { area = "JT", kampong = "BENGKURONG" }
    else if (hasWord(upperAddress, "BUNUT") == true) { area = "JT", kampong = "BUNUT" }
    else if (hasWord(upperAddress, "JALAN BABU RAJA") == true) { area = "JT", kampong = "JALAN BABU RAJA" }
    else if (hasWord(upperAddress, "JALAN ISTANA") == true) { area = "JT", kampong = "JALAN ISTANA" }
    else if (hasWord(upperAddress, "JUNJONGAN") == true) { area = "JT", kampong = "JUNJONGAN" }
    else if (hasWord(upperAddress, "KASAT") == true) { area = "JT", kampong = "KASAT" }
    else if (hasWord(upperAddress, "LUMAPAS") == true) { area = "JT", kampong = "LUMAPAS" }
    else if (hasWord(upperAddress, "JALAN HALUS") == true) { area = "JT", kampong = "JALAN HALUS" }
    else if (hasWord(upperAddress, "MADEWA") == true) { area = "JT", kampong = "MADEWA" }
    else if (hasWord(upperAddress, "PUTAT") == true) { area = "JT", kampong = "PUTAT" }
    else if (hasWord(upperAddress, "SINARUBAI") == true) { area = "JT", kampong = "SINARUBAI" }
    else if (hasWord(upperAddress, "TASEK MERADUN") == true) { area = "JT", kampong = "TASEK MERADUN" }
    else if (hasWord(upperAddress, "TELANAI") == true) { area = "JT", kampong = "TELANAI" }
    else if (hasWord(upperAddress, "BAN 1") == true) { area = "JT", kampong = "BAN" }
    else if (hasWord(upperAddress, "BAN 2") == true) { area = "JT", kampong = "BAN" }
    else if (hasWord(upperAddress, "BAN 3") == true) { area = "JT", kampong = "BAN" }
    else if (hasWord(upperAddress, "BAN 4") == true) { area = "JT", kampong = "BAN" }
    else if (hasWord(upperAddress, "BAN 5") == true) { area = "JT", kampong = "BAN" }
    else if (hasWord(upperAddress, "BAN 6") == true) { area = "JT", kampong = "BAN" }
    else if (hasWord(upperAddress, "BATONG") == true) { area = "JT", kampong = "BATONG" }
    else if (hasWord(upperAddress, "BATU AMPAR") == true) { area = "JT", kampong = "BATU AMPAR" }
    else if (hasWord(upperAddress, "BEBATIK") == true) { area = "JT", kampong = "BEBATIK KILANAS" }
    else if (hasWord(upperAddress, "BEBULOH") == true) { area = "JT", kampong = "BEBULOH" }
    else if (hasWord(upperAddress, "BEBATIK KILANAS") == true) { area = "JT", kampong = "BEBATIK KILANAS" }
    else if (hasWord(upperAddress, "KILANAS") == true) { area = "JT", kampong = "BEBATIK KILANAS" }
    else if (hasWord(upperAddress, "DADAP") == true) { area = "JT", kampong = "DADAP" }
    else if (hasWord(upperAddress, "KUALA LURAH") == true) { area = "JT", kampong = "KUALA LURAH" }
    else if (hasWord(upperAddress, "KULAPIS") == true) { area = "JT", kampong = "KULAPIS" }
    else if (hasWord(upperAddress, "LIMAU MANIS") == true) { area = "JT", kampong = "LIMAU MANIS" }
    else if (hasWord(upperAddress, "MASIN") == true) { area = "JT", kampong = "MASIN" }
    else if (hasWord(upperAddress, "MULAUT") == true) { area = "JT", kampong = "MULAUT" }
    else if (hasWord(upperAddress, "PANCHOR MURAI") == true) { area = "JT", kampong = "PANCHOR MURAI" }
    else if (hasWord(upperAddress, "PANCHUR MURAI") == true) { area = "JT", kampong = "PANCHOR MURAI" }
    else if (hasWord(upperAddress, "PANGKALAN BATU") == true) { area = "JT", kampong = "PANGKALAN BATU" }
    else if (hasWord(upperAddress, "PASAI") == true) { area = "JT", kampong = "PASAI" }
    else if (hasWord(upperAddress, "WASAN") == true) { area = "JT", kampong = "WASAN" }
    else if (hasWord(upperAddress, "PARIT") == true) { area = "JT", kampong = "PARIT" }
    else if (hasWord(upperAddress, "EMPIRE") == true) { area = "JT", kampong = "EMPIRE" }
    else if (hasWord(upperAddress, "JANGSAK") == true) { area = "JT", kampong = "JANGSAK" }
    else if (hasWord(upperAddress, "JERUDONG") == true) { area = "JT", kampong = "JERUDONG" }
    else if (hasWord(upperAddress, "KATIMAHAR") == true) { area = "JT", kampong = "KATIMAHAR" }
    else if (hasWord(upperAddress, "LUGU") == true) { area = "JT", kampong = "LUGU" }
    else if (hasWord(upperAddress, "SENGKURONG") == true) { area = "JT", kampong = "SENGKURONG" }
    else if (hasWord(upperAddress, "TANJONG NANGKA") == true) { area = "JT", kampong = "TANJONG NANGKA" }
    else if (hasWord(upperAddress, "TANJONG BUNUT") == true) { area = "JT", kampong = "TANJONG BUNUT" }
    else if (hasWord(upperAddress, "TANJUNG BUNUT") == true) { area = "JT", kampong = "TANJONG BUNUT" }
    else if (hasWord(upperAddress, "SUNGAI TAMPOI") == true) { area = "JT", kampung = "SUNGAI TAMPOI" }
    else if (hasWord(upperAddress, "SG TAMPOI") == true) { area = "JT", kampong = "SUNGAI TAMPOI" }
    else if (hasWord(upperAddress, "MUARA") == true) { area = "B", kampong = "MUARA" }
    //TU
    else if (hasWord(upperAddress, "SENGKARAI") == true) { area = "TUTONG", kampong = "SENGKARAI" }
    else if (hasWord(upperAddress, "PANCHOR") == true) { area = "TUTONG", kampong = "PANCHOR" }
    else if (hasWord(upperAddress, "PENABAI") == true) { area = "TUTONG", kampong = "PENABAI" }
    else if (hasWord(upperAddress, "KUALA TUTONG") == true) { area = "TUTONG", kampong = "KUALA TUTONG" }
    else if (hasWord(upperAddress, "PENANJONG") == true) { area = "TUTONG", kampong = "PENANJONG" }
    else if (hasWord(upperAddress, "KERIAM") == true) { area = "TUTONG", kampong = "KERIAM" }
    else if (hasWord(upperAddress, "BUKIT PANGGAL") == true) { area = "TUTONG", kampong = "BUKIT PANGGAL" }
    else if (hasWord(upperAddress, "PANGGAL") == true) { area = "TUTONG", kampong = "BUKIT PANGGAL" }
    else if (hasWord(upperAddress, "LUAGAN") == true) { area = "TUTONG", kampong = "LUAGAN DUDOK" }
    else if (hasWord(upperAddress, "DUDOK") == true) { area = "TUTONG", kampong = "LUAGAN DUDOK" }
    else if (hasWord(upperAddress, "LUAGAN DUDOK") == true) { area = "TUTONG", kampong = "LUAGAN DUDOK" }
    else if (hasWord(upperAddress, "SINAUT") == true) { area = "TUTONG", kampong = "SINAUT" }
    else if (hasWord(upperAddress, "SUNGAI KELUGOS") == true) { area = "TUTONG", kampong = "SUNGAI KELUGOS" }
    else if (hasWord(upperAddress, "KELUGOS") == true) { area = "TUTONG", kampong = "SUNGAI KELUGOS" }
    else if (hasWord(upperAddress, "SG KELUGOS") == true) { area = "TUTONG", kampong = "SUNGAI KELUGOS" }
    else if (hasWord(upperAddress, "KUPANG") == true) { area = "TUTONG", kampong = "KUPANG" }
    else if (hasWord(upperAddress, "KIUDANG") == true) { area = "TUTONG", kampong = "KIUDANG" }
    else if (hasWord(upperAddress, "PAD") == true) { area = "TUTONG", kampong = "PAD NUNOK" }
    else if (hasWord(upperAddress, "NUNOK") == true) { area = "TUTONG", kampong = "PAD NUNOK" }
    else if (hasWord(upperAddress, "PAD NUNOK") == true) { area = "TUTONG", kampong = "PAD NUNOK" }
    else if (hasWord(upperAddress, "BEKIAU") == true) { area = "TUTONG", kampong = "BEKIAU" }
    else if (hasWord(upperAddress, "MAU") == true) { area = "TUTONG", kampong = "PENGKALAN MAU" }
    else if (hasWord(upperAddress, "PENGKALAN MAU") == true) { area = "TUTONG", kampong = "PENGKALAN MAU" }
    else if (hasWord(upperAddress, "BATANG MITUS") == true) { area = "TUTONG", kampong = "BATANG MITUS" }
    else if (hasWord(upperAddress, "MITUS") == true) { area = "TUTONG", kampong = "BATANG MITUS" }
    else if (hasWord(upperAddress, "KEBIA") == true) { area = "TUTONG", kampong = "KEBIA" }
    else if (hasWord(upperAddress, "BIRAU") == true) { area = "TUTONG", kampong = "BIRAU" }
    else if (hasWord(upperAddress, "LAMUNIN") == true) { area = "TUTONG", kampong = "LAMUNIN" }
    else if (hasWord(upperAddress, "LAYONG") == true) { area = "TUTONG", kampong = "LAYONG" }
    else if (hasWord(upperAddress, "MENENGAH") == true) { area = "TUTONG", kampong = "MENENGAH" }
    else if (hasWord(upperAddress, "PANCHONG") == true) { area = "TUTONG", kampong = "PANCHONG" }
    else if (hasWord(upperAddress, "PENAPAR") == true) { area = "TUTONG", kampong = "PANAPAR" }
    else if (hasWord(upperAddress, "TANJONG MAYA") == true) { area = "TUTONG", kampong = "TANJONG MAYA" }
    else if (hasWord(upperAddress, "MAYA") == true) { area = "TUTONG", kampong = "MAYA" }
    else if (hasWord(upperAddress, "LUBOK") == true) { area = "TUTONG", kampong = "LUBOK PULAU" }
    else if (hasWord(upperAddress, "PULAU") == true) { area = "TUTONG", kampong = "LUBOK PULAU" }
    else if (hasWord(upperAddress, "LUBOK PULAU") == true) { area = "TUTONG", kampong = "LUBOK PULAU" }
    else if (hasWord(upperAddress, "BUKIT UDAL") == true) { area = "TUTONG", kampong = "BUKIT UDAL" }
    else if (hasWord(upperAddress, "UDAL") == true) { area = "TUTONG", kampong = "BUKIT UDAL" }
    else if (hasWord(upperAddress, "RAMBAI") == true) { area = "TUTONG", kampong = "RAMBAI" }
    else if (hasWord(upperAddress, "BENUTAN") == true) { area = "TUTONG", kampong = "BENUTAN" }
    else if (hasWord(upperAddress, "MERIMBUN") == true) { area = "TUTONG", kampong = "MERIMBUN" }
    else if (hasWord(upperAddress, "UKONG") == true) { area = "TUTONG", kampong = "UKONG" }
    else if (hasWord(upperAddress, "LONG") == true) { area = "TUTONG", kampong = "LONG MAYAN" }
    else if (hasWord(upperAddress, "MAYAN") == true) { area = "TUTONG", kampong = "LONG MAYAN" }
    else if (hasWord(upperAddress, "LONG MAYAN") == true) { area = "TUTONG", kampong = "LONG MAYAN" }
    else if (hasWord(upperAddress, "TELISAI") == true) { area = "TUTONG", kampong = "TELISAI" }
    else if (hasWord(upperAddress, "DANAU") == true) { area = "TUTONG", kampong = "DANAU" }
    else if (hasWord(upperAddress, "BUKIT BERUANG") == true) { area = "TUTONG", kampong = "BUKIT BERUANG" }
    else if (hasWord(upperAddress, "BERUANG") == true) { area = "TUTONG", kampong = "BUKIT BERUANG" }
    else if (hasWordAsDistrict(upperAddress, "TUTONG") == true) { area = "TUTONG", kampong = "TUTONG" }
    else if (/(JALAN|JLN)\s*TUTONG/.test(upperAddress)) { area = "JT", kampong = "JALAN TUTONG" }
    //KB
    else if (hasWord(upperAddress, "AGIS") == true) { area = "LUMUT", kampong = "AGIS" }
    else if (hasWord(upperAddress, "ANDALAU") == true) { area = "LUMUT", kampong = "ANDALAU" }
    else if (hasWord(upperAddress, "ANDUKI") == true) { area = "LUMUT", kampong = "ANDUKI" }
    else if (hasWord(upperAddress, "APAK") == true) { area = "KB / SERIA", kampong = "APAK" }
    else if (hasWord(upperAddress, "BADAS") == true) { area = "LUMUT", kampong = "BADAS" }
    else if (hasWord(upperAddress, "BATANG DURI") == true) { area = "TEMBURONG", kampong = "BATANG DURI" }
    else if (hasWord(upperAddress, "BANG") == true) { area = "KB / SERIA", kampong = "BANG" }
    else if (hasWord(upperAddress, "GARANG") == true) { area = "KB / SERIA", kampong = "GARANG" }
    else if (hasWord(upperAddress, "PUKUL") == true) { area = "KB / SERIA", kampong = "PUKUL" }
    else if (hasWord(upperAddress, "TAJUK") == true) { area = "KB / SERIA", kampong = "TAJUK" }
    else if (hasWord(upperAddress, "BENGERANG") == true) { area = "KB / SERIA", kampong = "BENGERANG" }
    else if (hasWord(upperAddress, "BIADONG") == true) { area = "KB / SERIA", kampong = "BIADONG" }
    else if (hasWord(upperAddress, "ULU") == true) { area = "KB / SERIA", kampong = "ULU" }
    else if (hasWord(upperAddress, "TENGAH") == true) { area = "KB / SERIA", kampong = "TENGAH" }
    else if (hasWord(upperAddress, "BISUT") == true) { area = "KB / SERIA", kampong = "BISUT" }
    else if (hasWord(upperAddress, "BUAU") == true) { area = "KB / SERIA", kampong = "BUAU" }
    else if (hasWord(upperAddress, "KANDOL") == true) { area = "KB / SERIA", kampong = "KANDOL" }
    else if (hasWord(upperAddress, "PUAN") == true) { area = "KB / SERIA", kampong = "PUAN" }
    else if (hasWord(upperAddress, "TUDING") == true) { area = "LUMUT", kampong = "TUDING" }
    else if (hasWord(upperAddress, "SAWAT") == true) { area = "KB / SERIA", kampong = "SAWAT" }
    else if (hasWord(upperAddress, "SERAWONG") == true) { area = "KB / SERIA", kampong = "SERAWONG" }
    else if (hasWord(upperAddress, "CHINA") == true) { area = "KB / SERIA", kampong = "CHINA" }
    else if (hasWord(upperAddress, "DUGUN") == true) { area = "KB / SERIA", kampong = "DUGUN" }
    else if (hasWord(upperAddress, "GATAS") == true) { area = "KB / SERIA", kampong = "GATAS" }
    else if (hasWord(upperAddress, "JABANG") == true) { area = "KB / SERIA", kampong = "JABANG" }
    else if (hasWord(upperAddress, "KAGU") == true) { area = "KB / SERIA", kampong = "KAGU" }
    else if (hasWord(upperAddress, "KAJITAN") == true) { area = "KB / SERIA", kampong = "KAJITAN" }
    else if (hasWord(upperAddress, "KELUYOH") == true) { area = "KB / SERIA", kampong = "KELUYOH" }
    else if (hasWord(upperAddress, "KENAPOL") == true) { area = "KB / SERIA", kampong = "KENAPOL" }
    else if (hasWord(upperAddress, "KUALA BALAI") == true) { area = "KB", kampong = "KUALA BALAI" }
    else if (hasWord(upperAddress, "BALAI") == true) { area = "KB", kampong = "KUALA BALAI" }
    else if (hasWord(upperAddress, "KUALA BELAIT") == true) { area = "KB", kampong = "KUALA BELAIT" }
    else if (hasWord(upperAddress, "KUKUB") == true) { area = "KB / SERIA", kampong = "KUKUB" }
    else if (hasWord(upperAddress, "LABI") == true) { area = "LUMUT", kampong = "LABI" }
    else if (hasWord(upperAddress, "LAKANG") == true) { area = "KB / SERIA", kampong = "LAKANG" }
    else if (hasWord(upperAddress, "LAONG ARUT") == true) { area = "KB / SERIA", kampong = "LAONG ARUT" }
    else if (hasWord(upperAddress, "ARUT") == true) { area = "KB / SERIA", kampong = "LAONG ARUT" }
    else if (hasWord(upperAddress, "LAONG") == true) { area = "KB / SERIA", kampong = "LAONG ARUT" }
    else if (hasWord(upperAddress, "LIANG") == true) { area = "LUMUT", kampong = "SUNGAI LIANG" }
    else if (hasWord(upperAddress, "SUNGAI LIANG") == true) { area = "LUMUT", kampong = "SUNGAI LIANG" }
    else if (hasWord(upperAddress, "SG LIANG") == true) { area = "LUMUT", kampong = "SUNGAI LIANG" }
    else if (hasWord(upperAddress, "LUMUT") == true) { area = "LUMUT", kampong = "LUMUT" }
    else if (hasWord(upperAddress, "LORONG") == true) { area = "SERIA", kampong = "LORONG" }
    else if (hasWord(upperAddress, "LORONG TENGAH") == true) { area = "SERIA", kampong = "LORONG TENGAH" }
    else if (hasWord(upperAddress, "LORONG TIGA SELATAN") == true) { area = "SERIA", kampong = "LORONG TIGA SELATAN" }
    else if (hasWord(upperAddress, "LILAS") == true) { area = "KB / SERIA", kampong = "LILAS" }
    else if (hasWord(upperAddress, "LUBUK LANYAP") == true) { area = "KB / SERIA", kampong = "LUBUK LANYAP" }
    else if (hasWord(upperAddress, "LANYAP") == true) { area = "KB / SERIA", kampong = "LUBUK LANYAP" }
    else if (hasWord(upperAddress, "LUBUK TAPANG") == true) { area = "KB / SERIA", kampong = "LUBUK TAPANG" }
    else if (hasWord(upperAddress, "TAPANG") == true) { area = "KB / SERIA", kampong = "LUBUK TAPANG" }
    else if (hasWord(upperAddress, "MALA'AS") == true) { area = "KB / SERIA", kampong = "MALA'AS" }
    else if (hasWord(upperAddress, "MALAAS") == true) { area = "KB / SERIA", kampong = "MALA'AS" }
    else if (hasWord(upperAddress, "MALAYAN") == true) { area = "KB / SERIA", kampong = "MELAYAN" }
    else if (hasWord(upperAddress, "MELAYU") == true) { area = "KB / SERIA", kampong = "MELAYU ASLI" }
    else if (hasWord(upperAddress, "ASLI") == true) { area = "KB / SERIA", kampong = "MELAYU ASLI" }
    else if (hasWord(upperAddress, "MELAYU ASLI") == true) { area = "KB / SERIA", kampong = "MELAYU ASLI" }
    else if (hasWord(upperAddress, "MELILAS") == true) { area = "LUMUT", kampong = "MELILAS" }
    else if (hasWord(upperAddress, "MENDARAM") == true) { area = "KB / SERIA", kampong = "MENDARAM" }
    else if (hasWord(upperAddress, "MENDARAM BESAR") == true) { area = "KB / SERIA", kampong = "MENDARAM" }
    else if (hasWord(upperAddress, "MENDARAM KECIL") == true) { area = "KB / SERIA", kampong = "MENDARAM" }
    else if (hasWord(upperAddress, "MERANGKING") == true) { area = "KB / SERIA", kampong = "MERANGKING" }
    else if (hasWord(upperAddress, "MERANGKING ULU") == true) { area = "KB / SERIA", kampong = "MERANGKING" }
    else if (hasWord(upperAddress, "MERANGKING HILIR") == true) { area = "KB / SERIA", kampong = "MERANGKING" }
    else if (hasWord(upperAddress, "MUMONG") == true) { area = "KB", kampong = "MUMONG" }
    else if (hasWord(upperAddress, "PANDAN") == true) { area = "KB", kampong = "PANDAN" }
    else if (hasWord(upperAddress, "PADANG") == true) { area = "KB", kampong = "PADANG" }
    else if (hasWord(upperAddress, "PANAGA") == true) { area = "SERIA", kampong = "PANAGA" }
    else if (hasWord(upperAddress, "PENGKALAN SIONG") == true) { area = "KB / SERIA", kampong = "PENGKALAN SIONG" }
    else if (hasWord(upperAddress, "SIONG") == true) { area = "KB / SERIA", kampong = "PENGKALAN SIONG" }
    else if (hasWord(upperAddress, "PENGALAYAN") == true) { area = "KB / SERIA", kampong = "PENGALAYAN" }
    else if (hasWord(upperAddress, "PENYRAP") == true) { area = "KB / SERIA", kampong = "PENYRAP" }
    else if (hasWord(upperAddress, "PERANGKONG") == true) { area = "KB / SERIA", kampong = "PERANGKONG" }
    else if (hasWord(upperAddress, "PERUMPONG") == true) { area = "LUMUT", kampong = "PERUMPONG" }
    else if (hasWord(upperAddress, "PESILIN") == true) { area = "KB / SERIA", kampong = "PESILIN" }
    else if (hasWord(upperAddress, "PULAU APIL") == true) { area = "KB / SERIA", kampong = "PULAU APIL" }
    else if (hasWord(upperAddress, "APIL") == true) { area = "KB / SERIA", kampong = "PULAU APIL" }
    else if (hasWord(upperAddress, "RAMPAYOH") == true) { area = "KB / SERIA", kampong = "RAMPAYOH" }
    else if (hasWord(upperAddress, "RATAN") == true) { area = "KB / SERIA", kampong = "RATAN" }
    else if (hasWord(upperAddress, "SAUD") == true) { area = "KB / SERIA", kampong = "SAUD" }
    //else if (hasWord(upperAddress, "SIMPANG") == true) {area = "KB / SERIA", kampong = "SIMPANG TIGA"}
    else if (hasWord(upperAddress, "SIMPANG TIGA") == true) { area = "LUMUT", kampong = "SIMPANG TIGA" }
    else if (hasWord(upperAddress, "SINGAP") == true) { area = "KB / SERIA", kampong = "SINGAP" }
    else if (hasWord(upperAddress, "SUKANG") == true) { area = "KB / SERIA", kampong = "SUKANG" }
    else if (hasWord(upperAddress, "BAKONG") == true) { area = "LUMUT", kampong = "BAKONG" }
    else if (hasWord(upperAddress, "DAMIT") == true) { area = "KB / SERIA", kampong = "DAMIT" }
    else if (hasWord(upperAddress, "BERA") == true) { area = "KB / SERIA", kampong = "BERA" }
    else if (hasWord(upperAddress, "DUHON") == true) { area = "KB / SERIA", kampong = "DUHON" }
    else if (hasWord(upperAddress, "GANA") == true) { area = "LUMUT", kampong = "GANA" }
    else if (hasWord(upperAddress, "HILIR") == true) { area = "KB / SERIA", kampong = "HILIR" }
    else if (hasWord(upperAddress, "KANG") == true) { area = "LUMUT", kampong = "KANG" }
    else if (hasWord(upperAddress, "KURU") == true) { area = "LUMUT", kampong = "KURU" }
    else if (hasWord(upperAddress, "LALIT") == true) { area = "LUMUT", kampong = "LALIT" }
    else if (hasWord(upperAddress, "LUTONG") == true) { area = "KB / SERIA", kampong = "LUTONG" }
    else if (hasWord(upperAddress, "MAU") == true) { area = "KB / SERIA", kampong = "MAU" }
    else if (hasWord(upperAddress, "MELILIT") == true) { area = "KB / SERIA", kampong = "MELILIT" }
    else if (hasWord(upperAddress, "PETAI") == true) { area = "KB / SERIA", kampong = "PETAI" }
    else if (hasWord(upperAddress, "TALI") == true) { area = "LUMUT", kampong = "TALI" }
    else if (hasWord(upperAddress, "TARING") == true) { area = "LUMUT", kampong = "TARING" }
    else if (hasWord(upperAddress, "TERABAN") == true) { area = "KB", kampong = "TERABAN" }
    else if (hasWord(upperAddress, "UBAR") == true) { area = "KB / SERIA", kampong = "UBAR" }
    else if (hasWord(upperAddress, "TANAJOR") == true) { area = "KB / SERIA", kampong = "TANAJOR" }
    else if (hasWord(upperAddress, "TANJONG RANGGAS") == true) { area = "KB / SERIA", kampong = "TANJONG RANGGAS" }
    else if (hasWord(upperAddress, "RANGGAS") == true) { area = "KB / SERIA", kampong = "TANJONG RANGGAS" }
    else if (hasWord(upperAddress, "TANJONG SUDAI") == true) { area = "KB / SERIA", kampong = "TANJONG SUDAI" }
    else if (hasWord(upperAddress, "SUDAI") == true) { area = "KB / SERIA", kampong = "TANJONG SUDAI" }
    else if (hasWord(upperAddress, "TAPANG LUPAK") == true) { area = "KB / SERIA", kampong = "TAPANG LUPAK" }
    else if (hasWord(upperAddress, "TARAP") == true) { area = "KB / SERIA", kampong = "TARAP" }
    else if (hasWord(upperAddress, "TEMPINAK") == true) { area = "KB / SERIA", kampong = "TEMPINAK" }
    else if (hasWord(upperAddress, "TERAJA") == true) { area = "KB / SERIA", kampong = "TERAJA" }
    else if (hasWord(upperAddress, "TERAWAN") == true) { area = "KB / SERIA", kampong = "TERAWAN" }
    else if (hasWord(upperAddress, "TERUNAN") == true) { area = "KB / SERIA", kampong = "TERUNAN" }
    else if (hasWord(upperAddress, "TUGONG") == true) { area = "KB / SERIA", kampong = "TUGONG" }
    else if (hasWord(upperAddress, "TUNGULLIAN") == true) { area = "LUMUT", kampong = "TUNGULLIAN" }
    else if (hasWord(upperAddress, "UBOK") == true) { area = "KB / SERIA", kampong = "UBOK" }
    else if (hasWord(upperAddress, "BELAIT") == true) { area = "KB / SERIA", kampong = "BELAIT" }
    else if (hasWord(upperAddress, "SERIA") == true) { area = "KB / SERIA", kampong = "BELAIT" }
    //TE
    else if (hasWord(upperAddress, "AMO") == true) { area = "TEMBURONG", kampong = "AMO" }
    else if (hasWord(upperAddress, "AYAM-AYAM") == true) { area = "TEMBURONG", kampong = "AYAM-AYAM" }
    else if (hasWord(upperAddress, "AYAM AYAM") == true) { area = "TEMBURONG", kampong = "AYAM-AYAM" }
    else if (hasWord(upperAddress, "BAKARUT") == true) { area = "TEMBURONG", kampong = "BAKARUT" }
    else if (hasWord(upperAddress, "BATANG TUAU") == true) { area = "TEMBURONG", kampong = "BATANG TUAU" }
    else if (hasWord(upperAddress, "BATU APOI") == true) { area = "TEMBURONG", kampong = "BATU APOI" }
    else if (hasWord(upperAddress, "APOI") == true) { area = "TEMBURONG", kampong = "BATU APOI" }
    else if (hasWord(upperAddress, "BATU BEJARAH") == true) { area = "TEMBURONG", kampong = "BATU BEJARAH" }
    else if (hasWord(upperAddress, "BEJARAH") == true) { area = "TEMBURONG", kampong = "BATU BEJARAH" }
    else if (hasWord(upperAddress, "BELABAN") == true) { area = "TEMBURONG", kampong = "BELABAN" }
    else if (hasWord(upperAddress, "BELAIS") == true) { area = "TEMBURONG", kampong = "BELAIS" }
    else if (hasWord(upperAddress, "BELINGOS") == true) { area = "TEMBURONG", kampong = "BELINGOS" }
    else if (hasWord(upperAddress, "BIANG") == true) { area = "TEMBURONG", kampong = "BIANG" }
    else if (hasWord(upperAddress, "BOKOK") == true) { area = "TEMBURONG", kampong = "BOKOK" }
    else if (hasWord(upperAddress, "BUDA BUDA") == true) { area = "TEMBURONG", kampong = "BUDA-BUDA" }
    else if (hasWord(upperAddress, "BUDA-BUDA") == true) { area = "TEMBURONG", kampong = "BUDA-BUDA" }
    else if (hasWord(upperAddress, "GADONG BARU") == true) { area = "TEMBURONG", kampong = "GADONG BARU" }
    else if (hasWord(upperAddress, "KENUA") == true) { area = "TEMBURONG", kampong = "KENUA" }
    else if (hasWord(upperAddress, "LABU ESTATE") == true) { area = "TEMBURONG", kampong = "LABU" }
    else if (hasWord(upperAddress, "LABU") == true) { area = "TEMBURONG", kampong = "LABU" }
    else if (hasWord(upperAddress, "LAGAU") == true) { area = "TEMBURONG", kampong = "LAGAU" }
    else if (hasWord(upperAddress, "LAKIUN") == true) { area = "TEMBURONG", kampong = "LAKIUN" }
    else if (hasWord(upperAddress, "LAMALING") == true) { area = "TEMBURONG", kampong = "LAMALING" }
    else if (hasWord(upperAddress, "LEPONG") == true) { area = "TEMBURONG", kampong = "LEPONG" }
    else if (hasWord(upperAddress, "LUAGAN") == true) { area = "TEMBURONG", kampong = "LUAGAN" }
    else if (hasWord(upperAddress, "MANIUP") == true) { area = "TEMBURONG", kampong = "MANIUP" }
    else if (hasWord(upperAddress, "MENENGAH") == true) { area = "TEMBURONG", kampong = "MENGENGAH" }
    else if (hasWord(upperAddress, "NEGALANG") == true) { area = "TEMBURONG", kampong = "NEGALANG" }
    else if (hasWord(upperAddress, "NEGALANG ERING") == true) { area = "TEMBURONG", kampong = "NEGALANG" }
    else if (hasWord(upperAddress, "NEGALANG UNAT") == true) { area = "TEMBURONG", kampong = "NEGALANG" }
    else if (hasWord(upperAddress, "PARIT") == true) { area = "TEMBURONG", kampong = "PARIT" }
    else if (hasWord(upperAddress, "PARIT BELAYANG") == true) { area = "TEMBURONG", kampong = "PARIT BELAYANG" }
    else if (hasWord(upperAddress, "PAYAU") == true) { area = "TEMBURONG", kampong = "PAYAU" }
    else if (hasWord(upperAddress, "PELIUNAN") == true) { area = "TEMBURONG", kampong = "PELIUNAN" }
    else if (hasWord(upperAddress, "PERDAYAN") == true) { area = "TEMBURONG", kampong = "PERDAYAN" }
    else if (hasWord(upperAddress, "PIASAU-PIASAU") == true) { area = "TEMBURONG", kampong = "PIASAU-PIASAU" }
    else if (hasWord(upperAddress, "PIASAU PIASAU") == true) { area = "TEMBURONG", kampong = "PIASAU-PIASAU" }
    else if (hasWord(upperAddress, "PIUNGAN") == true) { area = "TEMBURONG", kampong = "PIUNGAN" }
    else if (hasWord(upperAddress, "PUNI") == true) { area = "TEMBURONG", kampong = "PUNI" }
    else if (hasWord(upperAddress, "RATAIE") == true) { area = "TEMBURONG", kampong = "RATAIE" }
    else if (hasWord(upperAddress, "REBADA") == true) { area = "TEMBURONG", kampong = "REBADA" }
    else if (hasWord(upperAddress, "SEKUROP") == true) { area = "TEMBURONG", kampong = "SEKUROP" }
    else if (hasWord(upperAddress, "SELANGAN") == true) { area = "TEMBURONG", kampong = "SELANGAN" }
    else if (hasWord(upperAddress, "SELAPON") == true) { area = "TEMBURONG", kampong = "SELAPON" }
    else if (hasWord(upperAddress, "SEMABAT") == true) { area = "TEMBURONG", kampong = "SEMABAT" }
    else if (hasWord(upperAddress, "SEMAMAMNG") == true) { area = "TEMBURONG", kampong = "SEMAMANG" }
    else if (hasWord(upperAddress, "SENUKOH") == true) { area = "TEMBURONG", kampong = "SENUKOH" }
    else if (hasWord(upperAddress, "SERI TANJONG BELAYANG") == true) { area = "TEMBURONG", kampong = "SERI TANJONG BELAYANG" }
    else if (hasWord(upperAddress, "BELAYANG") == true) { area = "TEMBURONG", kampong = "SERI TANJONG BELAYANG" }
    else if (hasWord(upperAddress, "SIBULU") == true) { area = "TEMBURONG", kampong = "SIBULU" }
    else if (hasWord(upperAddress, "SIBUT") == true) { area = "TEMBURONG", kampong = "SIBUT" }
    else if (hasWord(upperAddress, "SIMBATANG BATU APOI") == true) { area = "TEMBURONG", kampong = "BATU APOI" }
    else if (hasWord(upperAddress, "SIMBATANG BOKOK") == true) { area = "TEMBURONG", kampong = "BOKOK" }
    else if (hasWord(upperAddress, "SUBOK") == true) { area = "TEMBURONG", kampong = "SUBOK" }
    else if (hasWord(upperAddress, "SUMBILING") == true) { area = "TEMBURONG", kampong = "SUMBILING" }
    else if (hasWord(upperAddress, "SUMBILING BARU") == true) { area = "TEMBURONG", kampong = "SUMBILING" }
    else if (hasWord(upperAddress, "SUMBILING LAMA") == true) { area = "TEMBURONG", kampong = "SUMBILING LAMA" }
    else if (hasWord(upperAddress, "SUNGAI RADANG") == true) { area = "TEMBURONG", kampong = "SUNGAI RADANG" }
    else if (hasWord(upperAddress, "SG RADANG") == true) { area = "TEMBURONG", kampong = "SUNGAI RADANG" }
    else if (hasWord(upperAddress, "SUNGAI SULOK") == true) { area = "TEMBURONG", kampong = "SUNGAI SULOK" }
    else if (hasWord(upperAddress, "SG SULOK ") == true) { area = "TEMBURONG", kampong = "SUNGAI SULOK" }
    else if (hasWord(upperAddress, "SUNGAI TANAM") == true) { area = "TEMBURONG", kampong = "SUNGAI TANAM" }
    else if (hasWord(upperAddress, "SG TANAM") == true) { area = "TEMBURONG", kampong = "SUNGAI TANAM" }
    else if (hasWord(upperAddress, "SUNGAI TANIT") == true) { area = "TEMBURONG", kampong = "SUNGAI TANIT" }
    else if (hasWord(upperAddress, "SG TANIT") == true) { area = "TEMBURONG", kampong = "SUNGAI TANIT" }
    else if (hasWord(upperAddress, "TANJONG BUNGAR") == true) { area = "TEMBURONG", kampong = "TANJONG BUNGAR" }
    else if (hasWord(upperAddress, "TEMADA") == true) { area = "TEMBURONG", kampong = "TEMADA" }
    else if (hasWord(upperAddress, "UJONG JALAN") == true) { area = "TEMBURONG", kampong = "UJONG JALAN" }
    else if (hasWord(upperAddress, "BANGAR") == true) { area = "TEMBURONG", kampong = "BANGAR" }
    else if (hasWord(upperAddress, "TEMBURONG") == true) { area = "TEMBURONG" }
    else { area = "N/A" }

    return area;
}

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    let prev = new Array(n + 1);
    let curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        }
        [prev, curr] = [curr, prev];
    }
    return prev[n];
}

// Max edit distance allowed for a keyword of a given length. Short keywords
// (<=4 chars, e.g. "BAN", "UDAL") are excluded from fuzzy matching entirely -
// too easy to false-positive on unrelated text.
function maxDistanceFor(len) {
    if (len <= 4) return 0;
    if (len <= 7) return 1;
    return 2;
}

function isWordChar(ch) {
    return !!ch && /[A-Z0-9]/.test(ch);
}

// Common Malay/English address vocabulary that is never itself a kampong
// name, but happens to sit within 1-2 edits of one (found 2026-10-19:
// SIMPANG/SERI/BANDAR/SETIA/MENTERI/etc. were all being fuzzy-matched to a
// specific area just because they're short and generic, not because the
// address said anything about that area - e.g. every "Simpang" junction in
// the country was landing in KB/SERIA). A full standalone word here is
// never treated as a fuzzy match candidate, no matter the edit distance.
const FUZZY_DENYLIST = new Set([
    "SIMPANG", "SERI", "BANDAR", "SELATAN", "SETIA",
    "MENTERI", "PUSAT", "PASAR", "ABANG", "BATANG",
    "SALAM", "PETANI", "BELAKANG", "HADAPAN", "ATAS", "KEDUA", "DUDUK",
    "MENCEGAH", "KEWANGAN", "PENYERANG", "SUKAN", "CINA", "MARA", "TENGKU",
    "UNGKU", "ATOK", "KETUA", "PERDANA", "KENANGAN", "TUNGGU", "MAIN",
    "PART", "GATES", "RATA", "TAMAN", "PERUMAHAN", "KOMPLEKS", "TINGKAT",
    "LORONG", "RUMAH", "BANGUNAN",
]);

// Does `haystack` contain a substring within `maxDist` edits of `needle`?
// Candidate windows must sit on word boundaries at both ends (not mid-word)
// - otherwise a short keyword like "BIANG" fuzzy-matches the "BANG" inside
// the common word "BANGUNAN" (building), mistagging any address that
// mentions a building. A genuine typo of a kampong name is still its own
// separated word, so this doesn't cost real fuzzy matches. Denylisted
// generic words are skipped outright even when the edit distance is low.
function fuzzyIncludes(haystack, needle, maxDist) {
    if (maxDist === 0) return haystack.includes(needle);
    const nLen = needle.length;
    for (let start = 0; start < haystack.length; start++) {
        if (isWordChar(haystack[start - 1])) continue;
        for (let winLen = nLen - maxDist; winLen <= nLen + maxDist; winLen++) {
            if (winLen < 1 || start + winLen > haystack.length) continue;
            if (isWordChar(haystack[start + winLen])) continue;
            const window = haystack.substr(start, winLen);
            if (FUZZY_DENYLIST.has(window)) continue;
            if (levenshtein(window, needle) <= maxDist) return true;
        }
    }
    return false;
}

// Typo-tolerant fallback over the same keyword list `getAreaFromAddress`
// uses, for when the address has a misspelled kampong name (e.g. "GADDONG",
// "KIULEP"). Only used after an exact match and postcode lookup both fail.
function fuzzyGetAreaFromAddress(address) {
    if (!address) return 'N/A';
    const upperAddress = address.toUpperCase();
    for (const { keyword, area } of KAMPONG_AREA_RULES) {
        const maxDist = maxDistanceFor(keyword.length);
        if (maxDist === 0) continue;
        if (fuzzyIncludes(upperAddress, keyword, maxDist)) {
            return area;
        }
    }
    return 'N/A';
}

// Main entry point: postal code first, then exact address match, then
// typo-tolerant address match. Same area codes throughout - no new scheme.
function determineArea(address, postalCode) {
    const byPostcode = getAreaFromPostcode(postalCode);
    if (byPostcode) return byPostcode;

    const byExactAddress = getAreaFromAddress(address);
    if (byExactAddress !== 'N/A') return byExactAddress;

    return fuzzyGetAreaFromAddress(address);
}

module.exports = {
    determineArea,
    getAreaFromAddress,
    getAreaFromPostcode,
    fuzzyGetAreaFromAddress,
    normalizePostalCode,
    POSTCODE_AREA_MAP,
    KAMPONG_AREA_RULES,
};
