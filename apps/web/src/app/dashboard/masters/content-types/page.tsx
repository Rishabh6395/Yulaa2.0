import MasterPage from '@/components/masters/MasterPage';

const FORM_NAMES = [
  'admission_form',
  'add_class_form',
  'add_student_form',
  'add_teacher_form',
  'add_parent_form',
  'create_exam_form',
  'profile_information_form',
  'query_form',
];

export default function ContentTypesPage() {
  return (
    <MasterPage
      title="Content Types"
      description="Custom fields for school forms"
      apiPath="/api/masters/content-types"
      dataKey="contentTypes"
      itemKey="contentType"
      fields={[
        { key: 'formName',  label: 'Form',       type: 'select', required: true, options: FORM_NAMES },
        { key: 'fieldSlot', label: 'Field Slot',  type: 'text',   required: true, placeholder: 'e.g. freetext_1' },
        { key: 'fieldType', label: 'Field Type',  type: 'select', required: true, options: ['text', 'dropdown'] },
        { key: 'label',     label: 'Label',       type: 'text',   required: true, placeholder: 'Display label' },
        { key: 'sortOrder', label: 'Sort Order',  type: 'number', default: 0 },
      ]}
      extraColumns={[
        { key: 'formName',  label: 'Form' },
        { key: 'fieldSlot', label: 'Slot' },
        { key: 'fieldType', label: 'Type' },
      ]}
    />
  );
}
