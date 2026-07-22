# Symptom Assistant API

Endpoint moi phuc vu UI tro ly AI hoi thoai cho trang tu van trieu chung.
Endpoint cu `/api/ai/symptom-checker` duoc giu nguyen de tranh pha vo giao dien hien tai.

## POST `/api/ai/symptom-assistant`

### Request

```json
{
  "symptoms": "Toi bi dau hong va ho 2 ngay",
  "latestMessage": "Hom nay toi sot nhe",
  "age": "28",
  "gender": "female",
  "duration": "2 ngay",
  "severity": "medium",
  "messages": [
    { "role": "user", "content": "Toi bi dau hong va ho" },
    { "role": "assistant", "content": "Ban co sot hoac kho tho khong?" }
  ]
}
```

`symptoms`, `latestMessage`, hoac `messages` can co it nhat mot truong co du lieu.

### Response

```json
{
  "success": true,
  "isFallback": false,
  "message": "Tro ly AI da phan tich trieu chung thanh cong",
  "data": {
    "assistantMessage": "string",
    "summary": "string",
    "possibleCauses": [
      "Huong lien quan co the xay ra, khong phai chan doan"
    ],
    "careGuidance": [
      "Huong cham soc an toan truoc khi kham"
    ],
    "nextSteps": [
      "Buoc tiep theo nguoi dung nen lam"
    ],
    "recommendations": [
      {
        "specialtyName": "Tai mui hong",
        "reason": "Phu hop voi dau hong, ho hoac nghẹt mui.",
        "confidence": 84,
        "priority": "medium",
        "matchingSymptoms": ["dau hong", "ho"],
        "bookingHint": "Nen dat lich neu trieu chung keo dai.",
        "specialty": {
          "_id": "mongo id",
          "name": "Tai mui hong",
          "clinicId": "mongo id",
          "clinicName": "Phong kham Phenikaa",
          "clinicCode": "PK",
          "matchedFrom": "Tai mui hong"
        },
        "canBook": true,
        "bookingStatus": "available",
        "bookingMessage": "Co the dat lich truc tiep voi chuyen khoa phu hop trong he thong."
      }
    ],
    "followUpQuestions": [
      {
        "id": "duration",
        "question": "Trieu chung da keo dai bao lau?",
        "choices": ["Duoi 24 gio", "2-3 ngay", "Tren 1 tuan"]
      }
    ],
    "quickReplies": ["Dat lich kham", "Toi muon bo sung trieu chung"],
    "safety": {
      "urgencyLevel": "low|medium|high",
      "warningSigns": ["string"],
      "recommendedAction": "string"
    },
    "updatedContext": {
      "symptoms": "string",
      "age": "string",
      "gender": "string",
      "duration": "string",
      "severity": "string",
      "notes": ["string"]
    },
    "matchedSpecialties": [],
    "disclaimer": "string"
  }
}
```

### Safety rules

- Khong chan doan chac chan.
- Khong ke thuoc hoac lieu dung.
- Khong thay the bac si.
- Neu co dau hieu nang, `safety.urgencyLevel` phai uu tien `high`.
- Ket qua phai tra loi nhu cau nguoi dung truoc khi goi y chuyen khoa: `possibleCauses`, `careGuidance`, `nextSteps`.
- Dau rang/rang/loi/nha khoa phai uu tien Rang ham mat/Nha khoa; khong map sang Co xuong khop neu khong co chan thuong ham/xuong ro rang.
- Fallback keyword van tra ve cung schema khi Gemini khong kha dung.

## Frontend booking handoff

Khi nguoi dung bam `Dat lich` tren mot recommendation co `canBook: true`, frontend dieu huong toi:

```txt
/booking?clinicId=<clinicId>&specialtyId=<specialtyId>&source=symptom-assistant
```

Trang booking dung query params de prefill co so va chuyen khoa. UI dong thoi luu them
`bookingcare:symptom-assistant-context` trong `sessionStorage` de hien banner ngu canh AI va dien goi y ly do kham.

Context nay chi phuc vu trai nghiem frontend, khong thay the du lieu lich hen da submit len backend.
