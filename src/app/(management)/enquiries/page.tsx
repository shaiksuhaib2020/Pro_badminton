import { getEnquiries } from '@/lib/queries/enquiries'
import EnquiryList from './_components/EnquiryList'

export default async function EnquiriesPage() {
  const enquiries = await getEnquiries()

  return <EnquiryList enquiries={enquiries} />
}
