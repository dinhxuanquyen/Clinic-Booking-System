import { displayText, hasValue } from '../../utils/medicalRecordView.js';

function getMedicineName(item) {
  return item?.medicineName || item?.name || item?.drugName || '';
}

function MedicineDetail({ label, value }) {
  if (!hasValue(value)) return null;
  return (
    <span>
      <small>{label}</small>
      {displayText(value)}
    </span>
  );
}

export default function PrescriptionSection({ prescription }) {
  const medicines = Array.isArray(prescription) ? prescription.filter((item) => hasValue(getMedicineName(item))) : [];

  if (!medicines.length) {
    return <p className="phr-compact-empty">Không kê đơn thuốc trong lần khám này.</p>;
  }

  return (
    <>
      <div className="phr-prescription-table phr-prescription-premium">
        <table>
          <thead>
            <tr>
              <th>Tên thuốc</th>
              <th>Liều dùng</th>
              <th>Số lần/ngày</th>
              <th>Thời gian</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {medicines.map((item, index) => (
              <tr key={`${getMedicineName(item)}-${index}`}>
                <td>
                  <strong>{displayText(getMedicineName(item))}</strong>
                </td>
                <td>{hasValue(item.dosage) ? displayText(item.dosage) : <span className="phr-muted-cell">Không ghi</span>}</td>
                <td>{hasValue(item.frequency) ? displayText(item.frequency) : <span className="phr-muted-cell">Không ghi</span>}</td>
                <td>{hasValue(item.duration) ? displayText(item.duration) : <span className="phr-muted-cell">Không ghi</span>}</td>
                <td>{hasValue(item.note) ? displayText(item.note) : <span className="phr-muted-cell">Không có</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="phr-medicine-cards phr-medicine-premium-cards">
        {medicines.map((item, index) => (
          <article key={`${getMedicineName(item)}-${index}`}>
            <div className="phr-medicine-card-head">
              <span className="phr-medicine-icon" aria-hidden="true" />
              <strong>{displayText(getMedicineName(item))}</strong>
            </div>
            <div className="phr-medicine-card-details">
              <MedicineDetail label="Liều dùng" value={item.dosage} />
              <MedicineDetail label="Số lần/ngày" value={item.frequency} />
              <MedicineDetail label="Thời gian" value={item.duration} />
              <MedicineDetail label="Ghi chú" value={item.note} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
