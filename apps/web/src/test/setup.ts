import { afterEach, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
// Solo tipos (se elimina al compilar): añade toBeInTheDocument, etc. a `expect` de vitest.
import type {} from '@testing-library/jest-dom/vitest';

// Los matchers se registran con el `expect` de este mismo módulo. Importar en tiempo de
// ejecución '@testing-library/jest-dom/vitest' fallaba de forma intermitente con la caché
// de Vite fría, porque extendía otra instancia de `expect`.
expect.extend(matchers);

afterEach(() => cleanup());
