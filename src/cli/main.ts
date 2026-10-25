#!/usr/bin/env node
import { CompositionRoot } from "./CompositionRoot.js";

// Process entry point. Nothing imports this module, so the boot call is
// unconditional; the wiring it triggers lives in CompositionRoot, which keeps the
// process side effect to exactly one file.
CompositionRoot.start();
