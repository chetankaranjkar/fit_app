// Shared Tailwind CSS class strings for consistency
export const tailwindClasses = {
  container: 'bg-white rounded-lg shadow-md p-8',
  pageHeader: 'flex justify-between items-center mb-8',
  pageTitle: 'text-3xl font-bold text-slate-800',
  button: {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded transition-colors',
    success: 'bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded transition-colors',
    danger: 'bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded transition-colors',
    secondary: 'bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded transition-colors',
    small: 'px-4 py-1 rounded text-sm transition-colors',
  },
  table: {
    wrapper: 'overflow-x-auto',
    base: 'w-full border-collapse',
    head: 'bg-gray-50',
    headCell: 'p-4 text-left border-b text-slate-800 font-semibold',
    bodyRow: 'hover:bg-gray-50',
    bodyCell: 'p-4 border-b',
  },
  form: {
    group: 'mb-6',
    label: 'block mb-2 text-slate-800 font-medium',
    input: 'w-full p-3 border border-gray-300 rounded',
    textarea: 'w-full p-3 border border-gray-300 rounded min-h-[100px] resize-y',
    select: 'w-full p-3 border border-gray-300 rounded',
  },
  modal: {
    overlay: 'fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50',
    content: 'bg-white rounded-lg max-w-2xl w-11/12 max-h-[90vh] overflow-y-auto shadow-xl',
    header: 'flex justify-between items-center p-6 border-b',
    title: 'text-xl font-semibold text-slate-800',
    closeButton: 'bg-none border-none text-2xl cursor-pointer text-gray-500 hover:text-slate-800',
    footer: 'flex justify-end gap-4 mt-8',
  },
  badge: {
    primary: 'inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800',
    success: 'inline-block px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800',
    warning: 'inline-block px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800',
  },
}

