import { bookingApi } from "../services/booking.api";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { ActionError, Loading, PageHeader, Panel } from "../../../shared/components/ui";
import { BookingActions } from "../components/BookingActions";
import { BookingOverview, BookingUsageHistory } from "../components/BookingOverview";

export function BookingDetailPage() {
  const { bookingId } = useParams({ from: "/_app/bookings/$bookingId" });
  const query = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => bookingApi.detail(bookingId),
  });

  if (query.isPending) return <Loading />;
  if (query.isError) return <ActionError error={query.error} />;

  const booking = query.data;

  return (
    <>
      <PageHeader
        title={booking.reference}
        description={booking.facility.name}
        action={
          <a
            className="button secondary"
            href="/bookings"
          >
            <ArrowLeft size={17} /> My bookings
          </a>
        }
      />
      <div className="detail-columns">
        <BookingOverview booking={booking} />
        <div className="stacked-panels">
          <Panel title="Operations">
            <BookingActions
              key={booking.version}
              booking={booking}
            />
          </Panel>
          <BookingUsageHistory booking={booking} />
        </div>
      </div>
    </>
  );
}
