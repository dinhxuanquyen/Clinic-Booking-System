import { useMemo } from 'react';
import { examMonthKey } from '../../utils/medicalRecordView.js';
import MedicalRecordCard from './MedicalRecordCard.jsx';

export default function MedicalRecordGroup({ records, onOpen, onDownload }) {
  const grouped = useMemo(() => records.reduce((result, record) => {
    const key = examMonthKey(record);
    result[key] = result[key] || [];
    result[key].push(record);
    return result;
  }, {}), [records]);

  return (
    <div className="phr-record-groups">
      {Object.entries(grouped).map(([month, items]) => (
        <section className="phr-record-month" key={month}>
          <div className="phr-month-heading">
            <h2>{month}</h2>
            <span>{items.length} hồ sơ</span>
          </div>
          <div className="phr-record-list">
            {items.map((record) => (
              <MedicalRecordCard key={record._id} record={record} onOpen={onOpen} onDownload={onDownload} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
