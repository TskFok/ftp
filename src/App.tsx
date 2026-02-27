import AppLayout from "./components/Layout";
import HostManager from "./components/HostManager";
import BookmarkPanel from "./components/BookmarkPanel";
import FileBrowser from "./components/FileBrowser";
import TransferQueue from "./components/TransferQueue";
import TransferHistory from "./components/TransferHistory";
import OverwriteDialog from "./components/OverwriteDialog";
import { useTransferListener } from "./hooks/useTransfer";

function App() {
  useTransferListener();

  return (
    <AppLayout
      sidebar={
        <>
          <HostManager />
          <BookmarkPanel />
        </>
      }
    >
      <FileBrowser />
      <TransferQueue />
      <TransferHistory />
      <OverwriteDialog />
    </AppLayout>
  );
}

export default App;
