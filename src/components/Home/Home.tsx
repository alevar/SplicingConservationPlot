import React, { useState } from "react";

import "./Home.css";

import SettingsPanel from "../SettingsPanel/SettingsPanel";
import ErrorModal from "../ErrorModal/ErrorModal";
import SplicePlotWrapper from "../SplicePlot/SplicePlotWrapper";

import { parseSJ, SJFile, SJData, parseBed, BedFile, BedData, Transcriptome } from 'sparrowgenomelib';

const Home: React.FC = () => {
    const [transcriptome, setTranscriptome] = useState<Transcriptome>(new Transcriptome());
    const [zoomWidth, setZoomWidth] = useState<number>(5);
    const [zoomWindowWidth, setZoomWindowWidth] = useState<number>(140);
    const [fontSize, setFontSize] = useState<number>(16);
    const [width, setWidth] = useState<number>(1500);
    const [height, setHeight] = useState<number>(1000);
    const [conservationBedFile, setConservationBedFile] = useState<BedFile>({data: new BedData(), fileName: "", status: 0});
    const [sjFiles, setSJFiles] = useState<{
        donors: SJFile;
        acceptors: SJFile;
    }>({donors: {data: new SJData(), fileName: "", status: 0},
        acceptors: {data: new SJData(), fileName: "", status: 0}});
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleGtfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const txdata = await Transcriptome.create(file);
                setTranscriptome(txdata);
            } catch (error) {
                setTranscriptome(new Transcriptome());
                setErrorMessage("Unable to parse the file. Please make sure the file is in GTF format. Try to run gffread -T to prepare your file.");
                setErrorModalVisible(true);
            }
        }
    };

    const handleConservationBedFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const bed_data: BedFile = await parseBed(file);
                bed_data.data.sort();
                setConservationBedFile({ ...bed_data, status: 1 });
            } catch (error) {
                setConservationBedFile({ ...conservationBedFile, status: -1 });
                setErrorMessage("Unable to parse the file. Please make sure the file is in BED format.");
                setErrorModalVisible(true);
            }
        }
    };

    const handleSJFileUpload = async (type: 'donors' | 'acceptors', event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const sj_data: SJFile = await parseSJ(file);
                sj_data.data.sort();
                setSJFiles(prevSJFiles => ({
                    ...prevSJFiles,
                    [type]: { ...sj_data, status: 1 }
                }));
            } catch (error) {
                setSJFiles(prevSJFiles => ({
                    ...prevSJFiles,
                    [type]: { ...prevSJFiles[type], status: -1 }
                }));
                setErrorMessage("Unable to parse the file. Please make sure the file is in SJ format (seqid, position, A, C, G, T, N).");
                setErrorModalVisible(true);
            }
        }
    };
    

    const closeErrorModal = () => {
        setErrorModalVisible(false);
    };

    return (
        <div className="splicemap-plot">
            <SettingsPanel
                gtfStatus={1}
                onGTFUpload={handleGtfUpload}
                conservationStatus={conservationBedFile.status}
                onConservationBedUpload={handleConservationBedFileUpload}
                donorsStatus={sjFiles.donors.status}
                acceptorsStatus={sjFiles.acceptors.status}
                onSJUpload={handleSJFileUpload}
                zoomWidth={zoomWidth}
                onZoomWidthChange={setZoomWidth}
                zoomWindowWidth={zoomWindowWidth}
                onZoomWindowWidthChange={setZoomWindowWidth}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                width={width}
                onWidthChange={setWidth}
                height={height}
                onHeightChange={setHeight}
            />

            <div className="visualization-container">
                <SplicePlotWrapper
                    transcriptome={transcriptome}
                    conservationBedFile={conservationBedFile}
                    sjFiles={sjFiles}
                    zoomWindowWidth={zoomWindowWidth}
                    width={width}
                    height={height}
                    fontSize={fontSize}
                />
            </div>

            <ErrorModal
                visible={errorModalVisible}
                message={errorMessage}
                onClose={closeErrorModal}
            />
        </div>
    );
};

export default Home;
